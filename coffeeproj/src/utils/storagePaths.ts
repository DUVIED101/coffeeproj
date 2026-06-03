export const PHOTO_LIMIT = 5;
export const MAX_PHOTO_BYTES = 7 * 1024 * 1024;

// MIME types Supabase Storage will accept and the app can actually render.
// HEIC/HEIF are common on iOS; react-native-image-picker auto-converts them
// for us but the type field still reports the original, so we whitelist them.
export const ALLOWED_PHOTO_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

export const canAddPhoto = (photos: string[], limit: number = PHOTO_LIMIT): boolean =>
  photos.length < limit;

export const isFileTooLarge = (
  bytes: number | undefined,
  limit: number = MAX_PHOTO_BYTES
): boolean => (bytes === undefined ? false : bytes > limit);

export type PhotoRejection = 'tooLarge' | 'invalidFormat';

export type AssetForValidation = {
  uri?: string;
  fileSize?: number;
  type?: string;
  fileName?: string;
};

// react-native-image-picker fills `type` on iOS but sometimes leaves it
// undefined (especially when the user picks via the system Files app). Fall
// back to the file extension so we don't reject legitimate JPEGs because of a
// missing mime header.
export const validateImageAsset = (asset: AssetForValidation): PhotoRejection | null => {
  if (isFileTooLarge(asset.fileSize)) return 'tooLarge';

  const mime = asset.type?.toLowerCase();
  if (mime) {
    return ALLOWED_PHOTO_MIME_TYPES.includes(mime) ? null : 'invalidFormat';
  }

  const haystack = `${asset.fileName ?? ''} ${asset.uri ?? ''}`.toLowerCase();
  const extMatch = haystack.match(/\.([a-z0-9]{1,5})(?:\?|$|\s)/);
  if (!extMatch) return null; // unknown — let the upload succeed or fail server-side
  const ext = extMatch[1];
  return ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext) ? null : 'invalidFormat';
};

export const buildBusinessLogoPath = (ownerId: string, timestamp: number): string =>
  `${ownerId}/logo_${timestamp}.jpg`;

export const buildBranchPhotoPath = (
  ownerId: string,
  branchId: string,
  timestamp: number
): string => `${ownerId}/${branchId}/photo_${timestamp}.jpg`;
