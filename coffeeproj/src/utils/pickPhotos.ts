import { Alert } from 'react-native';
import ImagePicker, { type Image as CroppedImage } from 'react-native-image-crop-picker';
import type { TFunction } from 'i18next';
import {
  MAX_PHOTO_BYTES,
  validateImageAsset,
  type AssetForValidation,
  type PhotoRejection,
} from './storagePaths';

// Minimal asset shape consumed by call sites. Mirrors what they used to read
// from react-native-image-picker's `Asset`, just constrained to what we
// actually map into the upload pipeline.
export type PickedAsset = {
  uri: string;
  fileSize?: number;
  type?: string;
  fileName?: string;
};

export type PickResult = {
  accepted: PickedAsset[];
  rejections: PhotoRejection[];
};

export type PickPhotosOptions = {
  // Kept for backwards-compatibility with previous callers that passed the
  // react-native-image-picker option bag. Only the two fields below are
  // actually honoured.
  mediaType?: 'photo';
  selectionLimit?: number;
  quality?: number;
};

const isCancelled = (e: unknown): boolean =>
  (e as { code?: string } | null)?.code === 'E_PICKER_CANCELLED';

const toAsset = (img: CroppedImage): PickedAsset | null => {
  if (!img.path) return null;
  return {
    uri: img.path,
    fileSize: typeof img.size === 'number' ? img.size : undefined,
    type: img.mime,
    fileName: typeof img.filename === 'string' ? img.filename : undefined,
  };
};

// We switched from react-native-image-picker to react-native-image-crop-picker
// here because iOS PhotoKit can hand the system picker `ph://`-scheme URIs (or
// iCloud placeholders for photos that haven't downloaded locally yet) for
// fresh camera shots. XHR in uploadImageToBucket can't fetch those, so the
// upload step would fail with "network error" even though the asset was
// genuinely selected. ICP always materialises a JPEG into the app's tmp
// directory and returns a real `file://` path, which round-trips cleanly.
// Cap uploaded resolution. Modern iPhone cameras shoot 4032×3024; without a
// cap each uploaded photo is 2-3 MB on disk, slow to push through the proxy
// and slow for Supabase's image transform endpoint to render on first access.
// 2000 px on the longest side keeps thumbnails sharp on 3× displays while
// shrinking files to ~400-800 KB.
const MAX_UPLOAD_DIMENSION = 2000;

export const pickPhotos = async (options: PickPhotosOptions): Promise<PickResult | null> => {
  const max = Math.max(1, options.selectionLimit ?? 1);
  const quality = options.quality ?? 0.8;
  try {
    const picked: CroppedImage[] =
      max > 1
        ? await ImagePicker.openPicker({
            multiple: true,
            maxFiles: max,
            mediaType: 'photo',
            compressImageQuality: quality,
            compressImageMaxWidth: MAX_UPLOAD_DIMENSION,
            compressImageMaxHeight: MAX_UPLOAD_DIMENSION,
            forceJpg: true,
            includeBase64: false,
          })
        : [
            await ImagePicker.openPicker({
              multiple: false,
              mediaType: 'photo',
              compressImageQuality: quality,
              compressImageMaxWidth: MAX_UPLOAD_DIMENSION,
              compressImageMaxHeight: MAX_UPLOAD_DIMENSION,
              forceJpg: true,
              includeBase64: false,
            }),
          ];

    const accepted: PickedAsset[] = [];
    const rejections: PhotoRejection[] = [];
    for (const img of picked) {
      const asset = toAsset(img);
      if (!asset) continue;
      const validationInput: AssetForValidation = {
        uri: asset.uri,
        fileSize: asset.fileSize,
        type: asset.type,
        fileName: asset.fileName,
      };
      const reason = validateImageAsset(validationInput);
      if (reason) rejections.push(reason);
      else accepted.push(asset);
    }
    return { accepted, rejections };
  } catch (e: unknown) {
    if (isCancelled(e)) return null;
    console.error('pickPhotos failed:', e);
    return null;
  }
};

/**
 * Show a single Alert summarising why some picked files were dropped.
 * No-op when nothing was rejected. Returns true if the caller should still
 * proceed (i.e. there is at least one accepted asset), false if everything
 * was rejected and the caller should bail out.
 */
export const reportRejections = (
  t: TFunction,
  result: PickResult,
  options?: { hasAccepted?: boolean }
): boolean => {
  const tooLargeCount = result.rejections.filter(r => r === 'tooLarge').length;
  const invalidFormatCount = result.rejections.filter(r => r === 'invalidFormat').length;
  const maxMb = MAX_PHOTO_BYTES / (1024 * 1024);
  const accepted = options?.hasAccepted ?? result.accepted.length > 0;

  if (tooLargeCount + invalidFormatCount === 0) return accepted;

  const messages: string[] = [];
  if (tooLargeCount > 0) {
    messages.push(t('photoErrors.tooLarge', { count: tooLargeCount, maxMb }));
  }
  if (invalidFormatCount > 0) {
    messages.push(t('photoErrors.invalidFormat', { count: invalidFormatCount }));
  }

  Alert.alert(t(accepted ? 'common.warning' : 'common.error'), messages.join('\n'), [
    { text: t('common.ok', { defaultValue: 'OK' }) },
  ]);

  return accepted;
};
