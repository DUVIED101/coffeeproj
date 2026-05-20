import {
  buildBusinessLogoPath,
  buildBranchPhotoPath,
  canAddPhoto,
  isFileTooLarge,
  MAX_PHOTO_BYTES,
  PHOTO_LIMIT,
} from './storagePaths';

describe('storage paths', () => {
  describe('buildBusinessLogoPath', () => {
    it('places the logo in the owner folder', () => {
      const path = buildBusinessLogoPath('owner-uuid-1', 1700000000000);

      expect(path).toBe('owner-uuid-1/logo_1700000000000.jpg');
    });
  });

  describe('buildBranchPhotoPath', () => {
    it('nests the branch folder under the owner folder', () => {
      const path = buildBranchPhotoPath('owner-uuid-1', 'branch-uuid-2', 1700000000000);

      expect(path).toBe('owner-uuid-1/branch-uuid-2/photo_1700000000000.jpg');
    });
  });
});

describe('canAddPhoto', () => {
  it('allows adding when the gallery is empty', () => {
    expect(canAddPhoto([])).toBe(true);
  });

  it('allows adding when the gallery is below the limit', () => {
    expect(canAddPhoto(['a', 'b', 'c', 'd'])).toBe(true);
  });

  it('blocks adding when the gallery is at the limit', () => {
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(full).toHaveLength(PHOTO_LIMIT);
    expect(canAddPhoto(full)).toBe(false);
  });
});

describe('isFileTooLarge', () => {
  it('accepts files exactly at the limit', () => {
    expect(isFileTooLarge(MAX_PHOTO_BYTES)).toBe(false);
  });

  it('rejects files one byte over the limit', () => {
    expect(isFileTooLarge(MAX_PHOTO_BYTES + 1)).toBe(true);
  });

  it('accepts unknown size (undefined) — picker did not report fileSize', () => {
    expect(isFileTooLarge(undefined)).toBe(false);
  });
});
