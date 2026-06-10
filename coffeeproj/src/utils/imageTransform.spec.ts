import { transformedImageUrl } from './imageTransform';

const SUPABASE_BASE = 'https://test.supabase.co';
const objectUrl = (path: string) => `${SUPABASE_BASE}/storage/v1/object/public/${path}`;

describe('transformedImageUrl', () => {
  it('returns undefined for null/undefined/empty input', () => {
    expect(transformedImageUrl(null, 48)).toBeUndefined();
    expect(transformedImageUrl(undefined, 48)).toBeUndefined();
    expect(transformedImageUrl('', 48)).toBeUndefined();
  });

  it('rewrites a Supabase Storage public URL to the render endpoint with transform params', () => {
    const input = objectUrl('barista-avatars/abc/avatar_123.jpg');
    const out = transformedImageUrl(input, 48);
    expect(out).toBe(
      `${SUPABASE_BASE}/storage/v1/render/image/public/barista-avatars/abc/avatar_123.jpg?width=96&height=96&resize=cover&quality=70`
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
