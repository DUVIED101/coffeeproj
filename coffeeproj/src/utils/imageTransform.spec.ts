import { normaliseStorageUrl, transformedImageUrl } from './imageTransform';
import { SUPABASE_URL } from '../config/supabase';

// Photos uploaded against any historical host get the current active host
// grafted on at display time. Tests use a synthetic "stored" host that is
// guaranteed to differ from SUPABASE_URL so the rewrite is observable.
const STORED_HOST = 'https://legacy.supabase.co';
const objectUrl = (path: string) => `${STORED_HOST}/storage/v1/object/public/${path}`;

describe('transformedImageUrl', () => {
  it('returns undefined for null/undefined/empty input', () => {
    expect(transformedImageUrl(null, 48)).toBeUndefined();
    expect(transformedImageUrl(undefined, 48)).toBeUndefined();
    expect(transformedImageUrl('', 48)).toBeUndefined();
  });

  it('rewrites a Supabase Storage public URL to the render endpoint with transform params on the active host', () => {
    const input = objectUrl('barista-avatars/abc/avatar_123.jpg');
    const out = transformedImageUrl(input, 48);
    expect(out).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/barista-avatars/abc/avatar_123.jpg?width=96&height=96&resize=cover&quality=70`
    );
  });

  it('applies 2x scaling for retina', () => {
    const input = objectUrl('barista-avatars/abc/avatar.jpg');
    expect(transformedImageUrl(input, 32)).toMatch(/width=64&height=64/);
    expect(transformedImageUrl(input, 96)).toMatch(/width=192&height=192/);
  });

  it('honors a custom quality', () => {
    const input = objectUrl('barista-avatars/abc/avatar.jpg');
    expect(transformedImageUrl(input, 48, 50)).toMatch(/quality=50$/);
  });

  it('preserves an existing query string by switching to &', () => {
    const input = `${objectUrl('barista-avatars/abc/avatar.jpg')}?v=2`;
    const out = transformedImageUrl(input, 48);
    expect(out).toContain('?v=2&width=');
  });

  it('passes through non-Supabase URLs unchanged', () => {
    const external = 'https://lh3.googleusercontent.com/a/AGNmyxYabc';
    expect(transformedImageUrl(external, 48)).toBe(external);
  });

  it('clamps tiny sizes to ≥ 1px', () => {
    const input = objectUrl('barista-avatars/abc/avatar.jpg');
    expect(transformedImageUrl(input, 0)).toMatch(/width=1&height=1/);
  });
});

describe('normaliseStorageUrl', () => {
  it('returns undefined for null/undefined/empty input', () => {
    expect(normaliseStorageUrl(null)).toBeUndefined();
    expect(normaliseStorageUrl(undefined)).toBeUndefined();
    expect(normaliseStorageUrl('')).toBeUndefined();
  });

  it('swaps the host of an /object/public/ URL to the active SUPABASE_URL', () => {
    const input = `${STORED_HOST}/storage/v1/object/public/branch-photos/biz/branch/photo_1.jpg`;
    expect(normaliseStorageUrl(input)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/branch-photos/biz/branch/photo_1.jpg`
    );
  });

  it('also swaps the host of a /render/image/public/ URL', () => {
    const input = `${STORED_HOST}/storage/v1/render/image/public/branch-photos/biz/branch/photo_1.jpg?width=96`;
    expect(normaliseStorageUrl(input)).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/branch-photos/biz/branch/photo_1.jpg?width=96`
    );
  });

  it('passes external URLs through unchanged', () => {
    const external = 'https://lh3.googleusercontent.com/a/AGNmyxYabc';
    expect(normaliseStorageUrl(external)).toBe(external);
  });
});
