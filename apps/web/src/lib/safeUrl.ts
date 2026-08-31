// User-supplied link fields (business website, social handles) end up in
// <a href>. Only http(s) may pass — a javascript:/data: scheme stored by a
// malicious account must never become a clickable link for other users.
export const safeExternalUrl = (
  raw: string | null | undefined,
): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
};
