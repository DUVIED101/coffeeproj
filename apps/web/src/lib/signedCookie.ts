// HMAC-SHA256-signed cookie payloads, Edge-runtime compatible (WebCrypto
// only). Same construction as the admin panel's adminCookie.ts; generic
// payload type so the middleware profile cache and the future OAuth
// role/consent stash (Phase 7) share one implementation.

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice(0, (4 - (input.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(
  payload: unknown,
  secret: string,
): Promise<string> {
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyPayload<T>(
  token: string,
  secret: string,
  isValid: (parsed: unknown) => parsed is T,
): Promise<T | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sig as BufferSource,
    encoder.encode(payloadB64),
  );
  if (!ok) return null;
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    );
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
