import { effectiveTextLength, clampToEffectiveLength, VIRTUAL_LINE_WIDTH } from './textLength';

describe('effectiveTextLength', () => {
  it('returns 0 for empty', () => {
    expect(effectiveTextLength('')).toBe(0);
  });

  it('counts a single line as its raw length', () => {
    expect(effectiveTextLength('hello')).toBe(5);
  });

  it('pads a short non-final line to the virtual width', () => {
    expect(effectiveTextLength('hi\nworld', 40)).toBe(40 + 5);
  });

  it('uses raw length when a line is already at/past the virtual width', () => {
    const long = 'x'.repeat(50);
    expect(effectiveTextLength(`${long}\nend`, 40)).toBe(50 + 3);
  });

  it('treats a trailing newline as a full empty line', () => {
    expect(effectiveTextLength('hi\n', 40)).toBe(40);
  });

  it('uses the configured default width when none is passed', () => {
    expect(effectiveTextLength('a\nb')).toBe(VIRTUAL_LINE_WIDTH + 1);
  });
});

describe('clampToEffectiveLength', () => {
  it('returns text unchanged when within limit', () => {
    expect(clampToEffectiveLength('hello', 10, 40)).toBe('hello');
  });

  it('drops trailing chars once limit is reached', () => {
    expect(clampToEffectiveLength('a\nb', 40, 40)).toBe('a\n');
  });

  it('keeps as much as fits with newline padding', () => {
    expect(clampToEffectiveLength('a\nbc', 42, 40)).toBe('a\nbc');
  });
});
