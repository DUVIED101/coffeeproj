// Allow-list for `next=` style redirect targets. Only same-origin absolute
// paths pass: `//host`, `/\host`, tab/newline-smuggled variants and
// scheme-prefixed values would all make window.location.assign or a server
// redirect leave the site. Parsing against a sentinel origin applies the
// exact whitespace-stripping and backslash rules browsers use.
const SENTINEL_ORIGIN = 'http://internal.invalid';

export const safeInternalPath = (raw: string | null | undefined): string | null => {
  if (!raw || !raw.startsWith('/')) return null;
  try {
    const url = new URL(raw, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};
