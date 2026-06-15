import { supabase } from '../config/supabase';

export {
  PHOTO_LIMIT,
  MAX_PHOTO_BYTES,
  ALLOWED_PHOTO_MIME_TYPES,
  canAddPhoto,
  isFileTooLarge,
  validateImageAsset,
  buildBusinessLogoPath,
  buildBranchPhotoPath,
} from './storagePaths';
export type { PhotoRejection, AssetForValidation } from './storagePaths';

export type UploadImageInput = {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string;
};

// ICP on iOS sometimes returns paths without the file:// prefix; XHR on RN
// can usually handle both, but normalising up-front avoids edge cases where
// the bare /private/var/... path is misread as a relative URL.
const normaliseLocalUri = (uri: string): string => {
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return uri.startsWith('/') ? `file://${uri}` : uri;
};

/**
 * React Native fetch() returns a Blob that Supabase Storage cannot upload directly;
 * XHR with arraybuffer responseType is the well-known workaround.
 */
const readFileAsArrayBuffer = (uri: string): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const status = xhr.status;
      const buffer = xhr.response as ArrayBuffer | null;
      if (!buffer || buffer.byteLength === 0) {
        reject(
          new Error(`Empty file (status=${status}, scheme=${uri.split(':')[0] ?? 'unknown'})`)
        );
        return;
      }
      resolve(buffer);
    };
    xhr.onerror = () => {
      const scheme = uri.split(':')[0] ?? 'unknown';
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
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

export const uploadImageToBucket = async ({
  bucket,
  path,
  uri,
  contentType = 'image/jpeg',
}: UploadImageInput): Promise<string> => {
  const normalised = normaliseLocalUri(uri);
  const arrayBuffer = await readFileAsArrayBuffer(normalised);

  // Paths are immutable (uuid + timestamp), so cache aggressively at the CDN
  // and on-device. 1 year matches typical "cache-forever for immutable URLs"
  // guidance — reduces origin-egress refetches when CDN edges evict.
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    cacheControl: '31536000, immutable',
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
};
