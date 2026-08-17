import {
  buildBusinessLogoPath,
  buildBranchPhotoPath,
  canAddPhoto,
  isFileTooLarge,
  MAX_PHOTO_BYTES,
  PHOTO_LIMIT,
  validateImageAsset,
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

describe('validateImageAsset', () => {
  it('returns tooLarge when the file exceeds MAX_PHOTO_BYTES', () => {
    expect(validateImageAsset({ uri: 'file:///tmp/big.jpg', fileSize: MAX_PHOTO_BYTES + 1 })).toBe(
      'tooLarge'
    );
  });

  it('returns invalidFormat for unsupported MIME types', () => {
    expect(validateImageAsset({ uri: 'file:///tmp/anim.gif', type: 'image/gif' })).toBe(
      'invalidFormat'
    );
  });

  it('accepts all whitelisted MIME types', () => {
    const accepted = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
    for (const mime of accepted) {
      expect(validateImageAsset({ uri: 'file:///tmp/photo', type: mime })).toBeNull();
    }
  });

  it('falls back to file extension when MIME is missing', () => {
    expect(validateImageAsset({ uri: 'file:///tmp/photo.heic' })).toBeNull();
    expect(validateImageAsset({ uri: 'file:///tmp/screenshot.bmp' })).toBe('invalidFormat');
  });

  it('returns null when MIME and extension are both missing', () => {
    expect(validateImageAsset({ uri: 'file:///tmp/IMG_0001' })).toBeNull();
  });
});
