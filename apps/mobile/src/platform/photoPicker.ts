import ImagePicker, { type Image as CroppedImage } from 'react-native-image-crop-picker';
import type {
  PhotoPickerAdapter,
  PickedAsset,
  PickResult,
  PhotoRejection,
} from '@bystrobarista/core/platform/photoPicker';
import { validateImageAsset, type AssetForValidation } from '../utils/storagePaths';

// See rationale in NotificationService/pickPhotos history: iOS PhotoKit can
// hand the RN picker `ph://` URIs (or iCloud placeholders that aren't
// downloaded locally). XHR-based upload can't fetch those. ICP always
// materialises a JPEG into the app's tmp dir and returns a real `file://`
// path, which round-trips cleanly through the upload pipeline.
// 2000 px keeps thumbnails sharp on 3× displays while shrinking files to
// ~400–800 KB (down from 2–3 MB for a raw 4032×3024 iPhone photo).
const MAX_UPLOAD_DIMENSION = 2000;

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

const normaliseLocalUri = (uri: string): string => {
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return uri.startsWith('/') ? `file://${uri}` : uri;
};

export const nativePhotoPicker: PhotoPickerAdapter = {
  async pick(options) {
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
        console.log('[nativePhotoPicker] asset', {
          uriScheme: asset.uri.split(':')[0],
          size: asset.fileSize,
          mime: asset.type,
          rejection: reason,
        });
        if (reason) rejections.push(reason);
        else accepted.push(asset);
      }
      const result: PickResult = { accepted, rejections };
      return result;
    } catch (e: unknown) {
      if (isCancelled(e)) return null;
      console.error('nativePhotoPicker.pick failed:', e);
      return null;
    }
  },

  readAsArrayBuffer(uri) {
    const normalised = normaliseLocalUri(uri);
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const status = xhr.status;
        const buffer = xhr.response as ArrayBuffer | null;
        if (!buffer || buffer.byteLength === 0) {
          reject(
            new Error(
              `Empty file (status=${status}, scheme=${normalised.split(':')[0] ?? 'unknown'})`
            )
          );
          return;
        }
        resolve(buffer);
      };
      xhr.onerror = () => {
        const scheme = normalised.split(':')[0] ?? 'unknown';
        reject(
          new Error(
            `Failed to read file (scheme=${scheme}). ` +
              (scheme === 'ph'
                ? 'iOS PhotoKit URI cannot be fetched directly — the picker should materialise to file://.'
                : 'Underlying I/O error.')
          )
        );
      };
      xhr.responseType = 'arraybuffer';
      xhr.open('GET', normalised, true);
      xhr.send(null);
    });
  },
};
