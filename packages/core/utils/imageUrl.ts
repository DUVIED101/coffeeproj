const STORAGE_MARKER_OBJECT = '/storage/v1/object/public/';
const STORAGE_MARKER_RENDER = '/storage/v1/render/image/public/';

/**
 * Rewrite a stored Supabase Storage URL so it hits the host currently active
 * for this client (proxy for RU users, direct otherwise). URLs stored in the
 * DB carry whatever host was active at upload time; grafting on the caller's
 * active host makes any record load for any viewer. Non-Supabase URLs (OAuth
 * avatars, dev-mode localhost paths) pass through unchanged.
 */
export const normaliseStorageUrlFor = (
  baseUrl: string,
  publicUrl: string | null | undefined
): string | undefined => {
  if (!publicUrl) return undefined;
  const idx =
    publicUrl.indexOf(STORAGE_MARKER_OBJECT) >= 0
      ? publicUrl.indexOf(STORAGE_MARKER_OBJECT)
      : publicUrl.indexOf(STORAGE_MARKER_RENDER);
  if (idx === -1) return publicUrl;
  return `${baseUrl}${publicUrl.slice(idx)}`;
};

/**
 * Rewrite a /object/public/ URL to the /render/image/public/ resize endpoint
 * (2× the logical size for retina, resize=cover). A 96×96 q70 avatar is
 * ~5-10 KB vs ~150-200 KB for the original — 20-40× less egress.
 */
export const transformedImageUrlFor = (
  baseUrl: string,
  publicUrl: string | null | undefined,
  size: number,
  quality: number = 70
): string | undefined => {
  const normalised = normaliseStorageUrlFor(baseUrl, publicUrl);
  if (!normalised) return undefined;
  if (normalised.indexOf(STORAGE_MARKER_OBJECT) === -1) return normalised;

  const base = normalised.replace(STORAGE_MARKER_OBJECT, STORAGE_MARKER_RENDER);
  const px = Math.max(1, Math.round(size * 2));
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${px}&height=${px}&resize=cover&quality=${quality}`;
};
