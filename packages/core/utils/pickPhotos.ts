import type { TFunction } from 'i18next';
import { getPlatform } from '../platform';
import type {
  PickedAsset,
  PickPhotosOptions,
  PickResult,
} from '../platform/photoPicker';
import { MAX_PHOTO_BYTES } from './storagePaths';

export type { PickedAsset, PickPhotosOptions, PickResult };

export const pickPhotos = (options: PickPhotosOptions): Promise<PickResult | null> =>
  getPlatform().photoPicker.pick(options);

/**
 * Show a single alert summarising why some picked files were dropped.
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

  getPlatform().alert.show(t(accepted ? 'common.warning' : 'common.error'), messages.join('\n'), [
    { text: t('common.ok', { defaultValue: 'OK' }) },
  ]);

  return accepted;
};
