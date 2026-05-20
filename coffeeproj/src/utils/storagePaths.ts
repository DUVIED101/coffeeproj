export const PHOTO_LIMIT = 5;
export const MAX_PHOTO_BYTES = 7 * 1024 * 1024;

export const canAddPhoto = (photos: string[], limit: number = PHOTO_LIMIT): boolean =>
  photos.length < limit;

export const isFileTooLarge = (
  bytes: number | undefined,
  limit: number = MAX_PHOTO_BYTES
): boolean => (bytes === undefined ? false : bytes > limit);

export const buildBusinessLogoPath = (ownerId: string, timestamp: number): string =>
  `${ownerId}/logo_${timestamp}.jpg`;

export const buildBranchPhotoPath = (
  ownerId: string,
  branchId: string,
  timestamp: number
): string => `${ownerId}/${branchId}/photo_${timestamp}.jpg`;
