import { describe, it, expect } from '@jest/globals';
import { safeInternalPath } from './safePath';

describe('safeInternalPath', () => {
  it('returns a plain internal path unchanged', () => {
    expect(safeInternalPath('/jobs')).toBe('/jobs');
  });

  it('keeps query string and hash', () => {
    expect(safeInternalPath('/jobs?tab=open#top')).toBe('/jobs?tab=open#top');
  });

  it('normalises dot segments', () => {
    expect(safeInternalPath('/chats/../jobs')).toBe('/jobs');
  });

  it.each([
    ['protocol-relative', '//evil.example/x'],
    ['backslash variant', '/\\evil.example'],
    ['tab-smuggled variant', '/\t/evil.example'],
    ['newline-smuggled variant', '/\n/evil.example'],
    ['absolute https url', 'https://evil.example/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['relative path', 'jobs'],
    ['empty string', ''],
  ])('rejects %s', (_label, input) => {
    expect(safeInternalPath(input)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect([safeInternalPath(null), safeInternalPath(undefined)]).toEqual([null, null]);
  });
});
