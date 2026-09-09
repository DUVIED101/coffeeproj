export type JwtClaims = {
  sub: string;
  exp: number;
  alg: string;
  kid: string | null;
};

const decodeSegment = (segment: string): Record<string, unknown> | null => {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const parsed: unknown = JSON.parse(json);
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

// Unverified read of the routing-relevant claims. Callers that need a
// trusted subject must still verify the signature; this only tells them
// which key to verify with and whether verification is worth attempting.
export const readJwtClaims = (token: string): JwtClaims | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);
  if (!header || !payload) return null;
  const { sub, exp } = payload;
  const { alg, kid } = header;
  if (typeof sub !== 'string' || typeof exp !== 'number' || typeof alg !== 'string') return null;
  return { sub, exp, alg, kid: typeof kid === 'string' ? kid : null };
};
