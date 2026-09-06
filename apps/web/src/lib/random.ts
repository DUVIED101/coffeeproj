// WebCrypto-only helpers usable from both the browser (Apple popup state and
// nonce) and route handlers (OAuth state cookie, PKCE verifier/challenge).
const base64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
};

export const randomToken = (bytes = 32): string =>
  base64Url(crypto.getRandomValues(new Uint8Array(bytes)));

export const sha256Base64Url = async (input: string): Promise<string> =>
  base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
    ),
  );

export const sha256Hex = async (input: string): Promise<string> =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
