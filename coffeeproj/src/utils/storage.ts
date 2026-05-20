import { supabase } from '../config/supabase';

export {
  PHOTO_LIMIT,
  MAX_PHOTO_BYTES,
  canAddPhoto,
  isFileTooLarge,
  buildBusinessLogoPath,
  buildBranchPhotoPath,
} from './storagePaths';

export type UploadImageInput = {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string;
};

/**
 * React Native fetch() returns a Blob that Supabase Storage cannot upload directly;
 * XHR with arraybuffer responseType is the well-known workaround.
 */
const readFileAsArrayBuffer = (uri: string): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to read file'));
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
  const arrayBuffer = await readFileAsArrayBuffer(uri);

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
};
