/**
 * Rewrite a Supabase Storage public URL so the CDN returns a resized variant.
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
  if (!publicUrl) return undefined;
  // Only transform Supabase Storage URLs. Pass everything else through —
  // OAuth-provider avatar URLs and dev-mode http://localhost paths must not
  // be rewritten.
  const marker = '/storage/v1/object/public/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return publicUrl;

  const base = publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const px = Math.max(1, Math.round(size * 2));
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${px}&height=${px}&resize=cover&quality=${quality}`;
};
