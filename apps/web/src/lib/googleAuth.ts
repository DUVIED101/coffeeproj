import { randomToken, sha256Hex } from "@/lib/random";

type GsiCredentialResponse = { credential: string; select_by?: string };

type GsiInitConfig = {
  client_id: string;
  callback: (response: GsiCredentialResponse) => void;
  nonce?: string;
  itp_support?: boolean;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
};

type GsiButtonConfig = {
  type: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  locale?: string;
};

export type GoogleAccountsId = {
  initialize(config: GsiInitConfig): void;
  renderButton(parent: HTMLElement, config: GsiButtonConfig): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<GoogleAccountsId> | null = null;

// Google Identity Services: the id_token is minted in the browser and posted
// to Supabase through whatever host the client already uses (the RU proxy
// for Russian timezones). That is why this path exists at all — the hosted
// OAuth round trip bounces through <ref>.supabase.co, which RU ISPs block.
export const loadGoogleIdentity = (): Promise<GoogleAccountsId> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if (window.google?.accounts?.id) resolve(window.google.accounts.id);
        else reject(new Error("gsi_unavailable"));
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("gsi_load_failed"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

export type GoogleNonce = { raw: string; hashed: string };

// Supabase matches the id_token's nonce claim against the SHA-256 hex of the
// value handed to signInWithIdToken, so Google gets the hash and Supabase
// the raw nonce — the pairing from Supabase's own web docs.
export const createGoogleNonce = async (): Promise<GoogleNonce> => {
  const raw = randomToken(32);
  return { raw, hashed: await sha256Hex(raw) };
};
