import { getCurrentLanguage } from "@bystrobarista/core/i18n";
import { randomToken } from "@/lib/random";

type AppleAuthConfig = {
  clientId: string;
  scope: string;
  redirectURI: string;
  state: string;
  nonce: string;
  usePopup: boolean;
};

type AppleSignInResponse = {
  authorization: { code: string; id_token: string; state?: string };
  user?: {
    email?: string;
    name?: { firstName?: string; lastName?: string };
  };
};

type AppleAuthApi = {
  init(config: AppleAuthConfig): void;
  signIn(): Promise<AppleSignInResponse>;
};

declare global {
  interface Window {
    AppleID?: { auth: AppleAuthApi };
  }
}

let scriptPromise: Promise<AppleAuthApi> | null = null;

export const loadAppleAuth = (): Promise<AppleAuthApi> => {
  if (window.AppleID) return Promise.resolve(window.AppleID.auth);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const locale = getCurrentLanguage() === "ru" ? "ru_RU" : "en_US";
      const script = document.createElement("script");
      script.src = `https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/${locale}/appleid.auth.js`;
      script.async = true;
      script.onload = () => {
        if (window.AppleID) resolve(window.AppleID.auth);
        else reject(new Error("apple_js_unavailable"));
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("apple_js_load_failed"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

export type ApplePopupOutcome =
  | { status: "ok"; idToken: string; nonce: string }
  | { status: "cancelled" }
  | { status: "popup_blocked" }
  | { status: "failed"; reason: string };

// Sign in with Apple JS in popup mode: the id_token comes straight back to
// this page, so one helper serves login AND the delete-account re-auth (no
// form_post round trip, no SameSite=None cookie). Supabase accepts the raw
// nonce and also matches Apple's claim against its SHA-256, so the same
// value goes to both sides — exactly like its Sign in with Apple JS docs.
export const signInWithApplePopup = async (
  clientId: string,
): Promise<ApplePopupOutcome> => {
  const auth = await loadAppleAuth();
  const state = randomToken(16);
  const nonce = randomToken(16);
  auth.init({
    clientId,
    scope: "name email",
    redirectURI: `${window.location.origin}/auth/callback/apple`,
    state,
    nonce,
    usePopup: true,
  });
  try {
    const response = await auth.signIn();
    if (response.authorization.state !== state) {
      return { status: "failed", reason: "state_mismatch" };
    }
    if (!response.authorization.id_token) {
      return { status: "failed", reason: "no_id_token" };
    }
    return { status: "ok", idToken: response.authorization.id_token, nonce };
  } catch (err) {
    const code =
      typeof (err as { error?: unknown })?.error === "string"
        ? (err as { error: string }).error
        : "";
    if (
      code === "popup_closed_by_user" ||
      code === "user_cancelled_authorize"
    ) {
      return { status: "cancelled" };
    }
    if (code.includes("popup") && code.includes("block")) {
      return { status: "popup_blocked" };
    }
    return { status: "failed", reason: code || String(err) };
  }
};
