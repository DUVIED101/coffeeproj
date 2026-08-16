import { SUPABASE_URL } from '../config/supabase';

const STORAGE_MARKER_OBJECT = '/storage/v1/object/public/';
const STORAGE_MARKER_RENDER = '/storage/v1/render/image/public/';

/**
 * Rewrite a stored Supabase Storage URL so it hits the host currently active
 * for this client (proxy for RU users, direct otherwise).
 *
 * The supabase-js client is pinned to a single host at app start, but URLs
 * stored in the DB carry whatever host was active at *upload* time — so an
 * old portfolio photo uploaded against `supabase.co` won't load for an RU
 * user whose client is on `api.bystrobarista.com`, because the direct edge
 * is blocked from RU. Conversely, a photo uploaded by an RU user gives
 * non-RU viewers an unnecessary proxy hop. Stripping the source host and
 * grafting on the current active one makes any record load for any viewer.
 *
 * Non-Supabase URLs (OAuth avatars, dev-mode localhost paths) pass through
 * unchanged.
 */
export const normaliseStorageUrl = (publicUrl: string | null | undefined): string | undefined => {
  if (!publicUrl) return undefined;
  const idx =
    publicUrl.indexOf(STORAGE_MARKER_OBJECT) >= 0
      ? publicUrl.indexOf(STORAGE_MARKER_OBJECT)
      : publicUrl.indexOf(STORAGE_MARKER_RENDER);
  if (idx === -1) return publicUrl;
  return `${SUPABASE_URL}${publicUrl.slice(idx)}`;
};

/**
 * Rewrite a Supabase Storage public URL so the CDN returns a resized variant
 * AND the host matches the current client's active choice.
 *
 * Supabase Storage exposes two endpoints for the same object:
 *   /object/public/<bucket>/<path>          — full-size original
 *   /render/image/public/<bucket>/<path>    — server-side image transformer
 *
 * The render endpoint accepts `?width`, `?height`, `?resize` and `?quality`
 * query params and serves a freshly resized JPEG/WebP. Typical avatar at
 * 96×96 q70 is ~5–10 KB, vs. ~150–200 KB for the full-size original —
 * roughly a 20–40× reduction in storage egress for small-display callers.
 *
 * @param publicUrl  An existing /object/public/... URL from Supabase Storage.
 *                   Non-Supabase URLs (e.g. external avatars from OAuth) are
 *                   returned unchanged.
 * @param size       Logical pixel size of the rendered <Image>/<FastImage>.
 *                   We render at 2× for retina displays automatically.
 * @param quality    JPEG quality 1–100. 70 is the visually-lossless sweet
 *                   spot for small thumbnails.
 */
export const transformedImageUrl = (
  publicUrl: string | null | undefined,
  size: number,
  quality: number = 70
): string | undefined => {
  const normalised = normaliseStorageUrl(publicUrl);
  if (!normalised) return undefined;
  if (normalised.indexOf(STORAGE_MARKER_OBJECT) === -1) return normalised;

  const base = normalised.replace(STORAGE_MARKER_OBJECT, STORAGE_MARKER_RENDER);
  const px = Math.max(1, Math.round(size * 2));
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${px}&height=${px}&resize=cover&quality=${quality}`;
};
