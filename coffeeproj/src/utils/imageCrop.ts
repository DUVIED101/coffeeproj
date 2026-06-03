import ImagePicker, { type Image as CroppedImage } from 'react-native-image-crop-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { MAX_PHOTO_BYTES, validateImageAsset } from './storagePaths';

export type CropError =
  | 'cancelled'
  | 'tooLarge'
  | 'invalidFormat'
  | 'nativeModuleMissing'
  | 'unknown';

export type CropOutcome = { ok: true; uri: string } | { ok: false; reason: CropError };

const ACCEPTED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

// react-native-image-crop-picker's index.js does
// `import ImageCropPicker from 'NativeModules'` — if the native pod hasn't been
// linked yet (pod install ran but iOS not rebuilt), the default export is null
// and any property access throws "Cannot read property 'openPicker' of null".
// Detect that here so we can fall back to the JS picker without cropping
// instead of bricking the avatar / logo upload UX.
const isNativeModuleReady = (): boolean => {
  try {
    return !!(ImagePicker as { openPicker?: unknown } | null)?.openPicker;
  } catch {
    return false;
  }
};

const isCancelled = (e: unknown): boolean => {
  const code = (e as { code?: string } | null)?.code;
  return code === 'E_PICKER_CANCELLED';
};

const isNativeModuleError = (e: unknown): boolean => {
  const message = (e as { message?: string } | null)?.message ?? '';
  return /openPicker.*of null|undefined is not an object.*openPicker/.test(message);
};

// Cropper output is always JPEG when forceJpg=true, so size is the file we'll
// actually upload — no need to budget for HEIC blow-up.
const evaluateOutput = (img: CroppedImage): CropOutcome => {
  if (typeof img.size === 'number' && img.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: 'tooLarge' };
  }
  if (img.mime && !ACCEPTED_MIMES.has(img.mime.toLowerCase())) {
    return { ok: false, reason: 'invalidFormat' };
  }
  if (!img.path) return { ok: false, reason: 'unknown' };
  return { ok: true, uri: img.path };
};

// Fallback path used when the native cropper isn't available yet. Lets the
// user at least pick + upload a photo (no in-app cropping) so the app stays
// usable while they rebuild iOS to link the new pod.
const pickWithoutCropping = async (): Promise<CropOutcome> => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 1,
  });
  if (result.didCancel) return { ok: false, reason: 'cancelled' };
  const asset = result.assets?.[0];
  if (!asset?.uri) return { ok: false, reason: 'unknown' };
  const reason = validateImageAsset(asset);
  if (reason) return { ok: false, reason };
  return { ok: true, uri: asset.uri };
};

/**
 * Pick a single avatar and crop it to a circle. Returns the cropped temp-file
 * URI ready for upload, or a typed failure for the caller to translate.
 */
export const pickAndCropAvatar = async (size: number = 800): Promise<CropOutcome> => {
  if (!isNativeModuleReady()) {
    console.warn(
      '[imageCrop] react-native-image-crop-picker native module is missing; ' +
        'falling back to plain picker. Rebuild iOS (npx react-native run-ios) to enable cropping.'
    );
    return pickWithoutCropping();
  }
  try {
    const picked = await ImagePicker.openPicker({
      width: size,
      height: size,
      cropping: true,
      cropperCircleOverlay: true,
      mediaType: 'photo',
      compressImageQuality: 0.85,
      includeBase64: false,
      forceJpg: true,
      avoidEmptySpaceAroundImage: true,
    });
    return evaluateOutput(picked);
  } catch (e: unknown) {
    if (isCancelled(e)) return { ok: false, reason: 'cancelled' };
    if (isNativeModuleError(e)) {
      console.warn('[imageCrop] Native module call failed, falling back to plain picker.', e);
      return pickWithoutCropping();
    }
    console.error('pickAndCropAvatar failed:', e);
    return { ok: false, reason: 'unknown' };
  }
};

/**
 * Pick a single image and crop it to the given aspect (for non-circular crops
 * like business logos and shop photos). Falls back to a square crop when both
 * dimensions match.
 */
export const pickAndCropRect = async (width: number, height: number): Promise<CropOutcome> => {
  if (!isNativeModuleReady()) {
    console.warn(
      '[imageCrop] react-native-image-crop-picker native module is missing; ' +
        'falling back to plain picker. Rebuild iOS to enable cropping.'
    );
    return pickWithoutCropping();
  }
  try {
    const picked = await ImagePicker.openPicker({
      width,
      height,
      cropping: true,
      mediaType: 'photo',
      compressImageQuality: 0.85,
      includeBase64: false,
      forceJpg: true,
      avoidEmptySpaceAroundImage: true,
    });
    return evaluateOutput(picked);
  } catch (e: unknown) {
    if (isCancelled(e)) return { ok: false, reason: 'cancelled' };
    if (isNativeModuleError(e)) {
      console.warn('[imageCrop] Native module call failed, falling back to plain picker.', e);
      return pickWithoutCropping();
    }
    console.error('pickAndCropRect failed:', e);
    return { ok: false, reason: 'unknown' };
  }
};
