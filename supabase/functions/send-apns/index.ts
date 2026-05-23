import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Brand<T, B> = T & { readonly __brand: B };
type UserId = Brand<string, "UserId">;
type DeviceToken = Brand<string, "DeviceToken">;

type ApnsEnvironment = "sandbox" | "production";

type NotificationKind =
  | "new_message"
  | "application_accepted"
  | "application_rejected"
  | "work_completion_requested"
  | "work_completion_confirmed"
  | "new_application"
  | "application_withdrawn"
  | "shift_cancelled"
  | "new_review"
  | "conversation_started";

type GatedKind =
  | "new_message"
  | "application_accepted"
  | "application_rejected"
  | "new_application"
  | "application_withdrawn"
  | "shift_cancelled"
  | "new_review"
  | "conversation_started";

type NotificationPrefsRow = {
  new_message: boolean;
  application_accepted: boolean;
  application_rejected: boolean;
  new_application: boolean;
  application_withdrawn: boolean;
  shift_cancelled: boolean;
  new_review: boolean;
  conversation_started: boolean;
};

const GATED_KIND_COLUMNS: Readonly<Record<GatedKind, keyof NotificationPrefsRow>> = {
  new_message: "new_message",
  application_accepted: "application_accepted",
  application_rejected: "application_rejected",
  new_application: "new_application",
  application_withdrawn: "application_withdrawn",
  shift_cancelled: "shift_cancelled",
  new_review: "new_review",
  conversation_started: "conversation_started",
};

function isGatedKind(kind: NotificationKind): kind is GatedKind {
  return kind in GATED_KIND_COLUMNS;
}

type SendApnsRequest = {
  recipient_id: UserId;
  kind: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type ApnsTokenRow = {
  device_token: DeviceToken;
  environment: ApnsEnvironment;
};

type JwtCache = { jwt: string; expiresAt: number };

const KNOWN_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "new_message",
  "application_accepted",
  "application_rejected",
  "work_completion_requested",
  "work_completion_confirmed",
  "new_application",
  "application_withdrawn",
  "shift_cancelled",
  "new_review",
  "conversation_started",
]);

const JWT_TTL_SECONDS = 3300;

const APNS_KEY_P8 = Deno.env.get("APNS_KEY_P8") ?? "";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Shared secret used by DB triggers to authenticate calls. Kept separate from the
// auto-injected SUPABASE_SERVICE_ROLE_KEY because that env can be either the legacy
// JWT or the new sb_secret_ format depending on project age — triggers need a value
// the Supabase gateway also accepts as JWT.
const INTERNAL_AUTH_TOKEN = Deno.env.get("INTERNAL_AUTH_TOKEN") ?? "";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

let cachedJwt: JwtCache | null = null;

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const av = i < ab.length ? ab[i] : 0;
    const bv = i < bb.length ? bb[i] : 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function isSendApnsRequest(value: unknown): value is SendApnsRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.recipient_id !== "string" || v.recipient_id.length === 0)
    return false;
  if (
    typeof v.kind !== "string" ||
    !KNOWN_KINDS.has(v.kind as NotificationKind)
  )
    return false;
  if (typeof v.title !== "string" || typeof v.body !== "string") return false;
  if (v.data !== undefined) {
    if (typeof v.data !== "object" || v.data === null) return false;
    for (const val of Object.values(v.data as Record<string, unknown>)) {
      if (typeof val !== "string") return false;
    }
  }
  return true;
}

function pemToPkcs8(pem: string): Uint8Array {
  const stripped = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(stripped);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function derToJose(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  if (der[0] !== 0x30) return der;
  const rLen = der[3];
  const rStart = 4;
  const sLenOffset = rStart + rLen + 1;
  const sLen = der[sLenOffset];
  const sStart = sLenOffset + 1;
  const r = der.slice(rStart, rStart + rLen);
  const s = der.slice(sStart, sStart + sLen);
  const rTrim = r[0] === 0x00 && r.length > 32 ? r.slice(1) : r;
  const sTrim = s[0] === 0x00 && s.length > 32 ? s.slice(1) : s;
  const out = new Uint8Array(64);
  out.set(rTrim, 32 - rTrim.length);
  out.set(sTrim, 64 - sTrim.length);
  return out;
}

async function signApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now) return cachedJwt.jwt;

  const header = { alg: "ES256", kid: APNS_KEY_ID, typ: "JWT" };
  const payload = { iss: APNS_TEAM_ID, iat: now };
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyBytes = pemToPkcs8(APNS_KEY_P8);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signatureRaw = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      encoder.encode(signingInput),
    ),
  );
  const jose = derToJose(signatureRaw);
  const jwt = `${signingInput}.${base64UrlEncode(jose)}`;

  cachedJwt = { jwt, expiresAt: now + JWT_TTL_SECONDS };
  return jwt;
}

function apnsHostFor(env: ApnsEnvironment): string {
  return env === "sandbox"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
}

type ApnsSendOutcome = "sent" | "retired" | "failed";

async function sendOneApns(
  jwt: string,
  token: ApnsTokenRow,
  payload: Record<string, unknown>,
): Promise<ApnsSendOutcome> {
  const url = `https://${apnsHostFor(token.environment)}/3/device/${token.device_token}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": "0",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("apns fetch error", {
      env: token.environment,
      err: String(err),
    });
    return "failed";
  }

  if (response.status === 200) return "sent";

  let reason = "";
  try {
    const json = (await response.json()) as { reason?: string };
    reason = json.reason ?? "";
  } catch {
    reason = "";
  }

  if (
    response.status === 410 ||
    (response.status === 400 && reason === "BadDeviceToken")
  ) {
    return "retired";
  }

  console.warn("apns non-success", { status: response.status, reason });
  return "failed";
}

async function isKindEnabled(
  supabase: SupabaseClient,
  recipientId: UserId,
  kind: NotificationKind,
): Promise<boolean> {
  if (!isGatedKind(kind)) return true;
  const column = GATED_KIND_COLUMNS[kind];
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "new_message, application_accepted, application_rejected, new_application, application_withdrawn, shift_cancelled, new_review, conversation_started",
    )
    .eq("user_id", recipientId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return true;
    throw new Error(`notification_preferences query failed: ${error.message}`);
  }
  if (data === null) return true;
  const row = data as NotificationPrefsRow;
  return row[column];
}

async function loadActiveTokens(
  supabase: SupabaseClient,
  recipientId: UserId,
): Promise<ApnsTokenRow[]> {
  const { data, error } = await supabase
    .from("apns_tokens")
    .select("device_token, environment")
    .eq("user_id", recipientId);
  if (error) throw new Error(`apns_tokens query failed: ${error.message}`);
  return (data ?? []) as ApnsTokenRow[];
}

async function deleteRetiredToken(
  supabase: SupabaseClient,
  recipientId: UserId,
  deviceToken: DeviceToken,
): Promise<void> {
  const { error } = await supabase
    .from("apns_tokens")
    .delete()
    .eq("user_id", recipientId)
    .eq("device_token", deviceToken);
  if (error)
    console.warn("failed to delete retired token", { message: error.message });
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${INTERNAL_AUTH_TOKEN}`;
  if (!INTERNAL_AUTH_TOKEN || !timingSafeEqual(authHeader, expected)) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  if (!isSendApnsRequest(parsed)) {
    return jsonResponse(400, { error: "invalid_request" });
  }
  const request = parsed;

  if (!APNS_KEY_P8 || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) {
    return jsonResponse(500, { error: "apns_not_configured" });
  }
  if (!SUPABASE_URL) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let allowed: boolean;
  try {
    allowed = await isKindEnabled(supabase, request.recipient_id, request.kind);
  } catch (err) {
    console.error("pref lookup failed", { err: String(err) });
    return jsonResponse(500, { error: "pref_lookup_failed" });
  }
  if (!allowed) {
    return jsonResponse(200, { ok: true, sent: 0, suppressed: true });
  }

  const tokens = await loadActiveTokens(supabase, request.recipient_id);
  if (tokens.length === 0) {
    return jsonResponse(200, { ok: true, sent: 0, removed_tokens: 0 });
  }

  let jwt: string;
  try {
    jwt = await signApnsJwt();
  } catch (err) {
    console.error("jwt signing failed", { err: String(err) });
    return jsonResponse(500, { error: "jwt_signing_failed" });
  }

  const apnsPayload: Record<string, unknown> = {
    aps: {
      alert: { title: request.title, body: request.body },
      sound: "default",
      "mutable-content": 1,
    },
    kind: request.kind,
    ...(request.data ?? {}),
  };

  const outcomes = await Promise.all(
    tokens.map(async (token) => {
      try {
        const outcome = await sendOneApns(jwt, token, apnsPayload);
        if (outcome === "retired") {
          await deleteRetiredToken(
            supabase,
            request.recipient_id,
            token.device_token,
          );
        }
        return outcome;
      } catch (err) {
        console.warn("per-token send failed", { err: String(err) });
        return "failed" as ApnsSendOutcome;
      }
    }),
  );

  const sent = outcomes.filter((o) => o === "sent").length;
  const removed = outcomes.filter((o) => o === "retired").length;
  return jsonResponse(200, { ok: true, sent, removed_tokens: removed });
}

Deno.serve(handleRequest);
