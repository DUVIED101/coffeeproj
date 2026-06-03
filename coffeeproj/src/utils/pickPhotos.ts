import { Alert } from 'react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import type { TFunction } from 'i18next';
import { MAX_PHOTO_BYTES, validateImageAsset, type PhotoRejection } from './storagePaths';

export type PickResult = {
  accepted: Asset[];
  rejections: PhotoRejection[];
};

export const pickPhotos = async (options: ImageLibraryOptions): Promise<PickResult | null> => {
  const result = await launchImageLibrary(options);
  if (result.didCancel || !result.assets?.length) return null;

  const accepted: Asset[] = [];
  const rejections: PhotoRejection[] = [];
  for (const asset of result.assets) {
    if (!asset.uri) continue;
    const reason = validateImageAsset(asset);
    if (reason) {
      rejections.push(reason);
    } else {
      accepted.push(asset);
    }
  }
  return { accepted, rejections };
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
