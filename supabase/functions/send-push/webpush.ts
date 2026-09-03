// Web Push sender built on WebCrypto only (RFC 8291 aes128gcm content
// encryption + RFC 8292 VAPID). No npm dependency — Deno's edge runtime and
// Node both expose crypto.subtle, so this module is unit-tested against the
// RFC 8291 Appendix A vector under Node before deploy.

export type WebPushSubscription = {
  endpoint: string;
  p256dh: string; // base64url, 65-byte uncompressed P-256 point
  auth: string; // base64url, 16-byte auth secret
};

export type VapidKeys = {
  publicKey: string; // base64url, 65-byte uncompressed P-256 point
  privateKey: string; // base64url, 32-byte scalar
  subject: string; // "mailto:…" or "https://…"
};

export type WebPushOptions = {
  ttlSeconds: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  // ≤ 32 chars from the base64url alphabet; later pushes with the same topic
  // replace earlier undelivered ones (the Web Push twin of apns-collapse-id).
  topic?: string;
};

export type WebPushOutcome = 'sent' | 'retired' | 'failed';

const encoder = new TextEncoder();

export const base64UrlDecode = (input: string): Uint8Array => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

export const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

const hkdf = async (
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  lengthBytes: number
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    lengthBytes * 8
  );
  return new Uint8Array(bits);
};

const importEcdhPublic = (raw: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

const exportRawPublic = async (key: CryptoKey): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.exportKey('raw', key));

// Injectable ephemeral material so the RFC test vector can pin the "as"
// keypair and salt; production callers leave both undefined.
export type EncryptionMaterial = {
  asKeyPair?: CryptoKeyPair;
  salt?: Uint8Array;
};

export const importAsKeyPair = async (
  publicKeyB64: string,
  privateKeyB64: string
): Promise<CryptoKeyPair> => {
  const pub = base64UrlDecode(publicKeyB64);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(pub.slice(1, 33)),
    y: base64UrlEncode(pub.slice(33, 65)),
    d: privateKeyB64,
  };
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const publicKey = await importEcdhPublic(pub);
  return { privateKey, publicKey };
};

// RFC 8291 §3 + RFC 8188: returns the aes128gcm body (header || ciphertext).
export const encryptPayload = async (
  subscription: Pick<WebPushSubscription, 'p256dh' | 'auth'>,
  plaintext: Uint8Array,
  material: EncryptionMaterial = {}
): Promise<Uint8Array> => {
  const uaPublicRaw = base64UrlDecode(subscription.p256dh);
  const authSecret = base64UrlDecode(subscription.auth);
  const asKeyPair =
    material.asKeyPair ??
    (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const asPublicRaw = await exportRawPublic(asKeyPair.publicKey);
  const salt = material.salt ?? crypto.getRandomValues(new Uint8Array(16));

  const uaPublicKey = await importEcdhPublic(uaPublicRaw);
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  const keyInfo = concat(encoder.encode('WebPush: info\0'), uaPublicRaw, asPublicRaw);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  // Single record: plaintext || 0x02 delimiter (last record, no padding).
  const padded = concat(plaintext, new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  const header = concat(salt, recordSize, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concat(header, ciphertext);
};

// RFC 8292: ES256 JWT over {aud, exp, sub}, carried as `vapid t=…, k=…`.
export const buildVapidAuthorization = async (
  endpoint: string,
  keys: VapidKeys,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> => {
  const audience = new URL(endpoint).origin;
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64UrlEncode(
    encoder.encode(JSON.stringify({ aud: audience, exp: nowSeconds + 12 * 3600, sub: keys.subject }))
  );
  const signingInput = `${header}.${claims}`;

  const pub = base64UrlDecode(keys.publicKey);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(pub.slice(1, 33)),
      y: base64UrlEncode(pub.slice(33, 65)),
      d: keys.privateKey,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  // WebCrypto ECDSA emits the raw r||s (64 bytes) that JWS expects.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(signingInput))
  );
  return `vapid t=${signingInput}.${base64UrlEncode(signature)}, k=${keys.publicKey}`;
};

export const sendWebPush = async (
  subscription: WebPushSubscription,
  payload: string,
  keys: VapidKeys,
  options: WebPushOptions
): Promise<{ outcome: WebPushOutcome; status: number }> => {
  const body = await encryptPayload(subscription, encoder.encode(payload));
  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
    'content-encoding': 'aes128gcm',
    ttl: String(options.ttlSeconds),
    authorization: await buildVapidAuthorization(subscription.endpoint, keys),
  };
  if (options.urgency) headers.urgency = options.urgency;
  if (options.topic) headers.topic = options.topic;

  let response: Response;
  try {
    response = await fetch(subscription.endpoint, { method: 'POST', headers, body });
  } catch (err) {
    console.warn('webpush fetch error', { err: String(err) });
    return { outcome: 'failed', status: 0 };
  }
  if (response.status === 201 || response.status === 200) {
    return { outcome: 'sent', status: response.status };
  }
  // 404/410: the subscription is gone — drop it so we stop paying for it.
  if (response.status === 404 || response.status === 410) {
    return { outcome: 'retired', status: response.status };
  }
  console.warn('webpush non-success', {
    status: response.status,
    body: (await response.text().catch(() => '')).slice(0, 200),
  });
  return { outcome: 'failed', status: response.status };
};
