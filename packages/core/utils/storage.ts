import { getSupabase } from '../config/supabase';
import { getPlatform } from '../platform';

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

export const uploadImageToBucket = async ({
  bucket,
  path,
  uri,
  contentType = 'image/jpeg',
}: UploadImageInput): Promise<string> => {
  const arrayBuffer = await getPlatform().photoPicker.readAsArrayBuffer(uri);

  // Paths are immutable (uuid + timestamp), so cache aggressively at the CDN
  // and on-device. 1 year matches typical "cache-forever for immutable URLs"
  // guidance — reduces origin-egress refetches when CDN edges evict.
  const supabase = getSupabase();
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
