import { signPayload, verifyPayload } from "@/lib/signedCookie";

export const OAUTH_STATE_COOKIE = "bb_oauth_state";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// One in-flight redirect-based OAuth handshake per browser, HMAC-signed and
// HTTP-only. `state` is echoed back by the provider and compared (CSRF),
// `verifier` is the PKCE secret for the /token exchange, `next` the
// post-login destination.
export type OAuthStatePayload = {
  provider: "yandex";
  state: string;
  verifier: string;
  next: string | null;
  exp: number;
};

export const isOAuthStatePayload = (v: unknown): v is OAuthStatePayload => {
  const p = v as OAuthStatePayload | null;
  return (
    !!p &&
    p.provider === "yandex" &&
    typeof p.state === "string" &&
    typeof p.verifier === "string" &&
    (p.next === null || typeof p.next === "string") &&
    typeof p.exp === "number"
  );
};

export const signOAuthState = (
  payload: OAuthStatePayload,
  secret: string,
): Promise<string> => signPayload(payload, secret);

export const readOAuthState = async (
  raw: string | undefined,
  secret: string | undefined,
): Promise<OAuthStatePayload | null> => {
  if (!raw || !secret) return null;
  const payload = await verifyPayload(raw, secret, isOAuthStatePayload);
  return payload && payload.exp > Date.now() ? payload : null;
};
