import { isRectUsable, padRect, placeCard } from './placement';

const viewport = { width: 390, height: 844 };
const card = { width: 320, height: 160 };
const opts = { gap: 12, margin: 16, insets: { top: 59, bottom: 34 } };

describe('placeCard', () => {
  it('places the card below the hole when there is room', () => {
    const hole = { x: 120, y: 200, width: 120, height: 44 };
    expect(placeCard(hole, card, viewport, opts)).toEqual({ top: 256, left: 20, side: 'below' });
  });

  it('places the card above the hole when there is no room below', () => {
    const hole = { x: 120, y: 720, width: 120, height: 44 };
    expect(placeCard(hole, card, viewport, opts)).toEqual({ top: 548, left: 20, side: 'above' });
  });

  it('hugs the bottom of the safe area when it fits neither below nor above', () => {
    const tallViewport = { width: 390, height: 300 };
    const hole = { x: 120, y: 120, width: 120, height: 60 };
    expect(placeCard(hole, card, tallViewport, opts)).toEqual({
      top: 90,
      left: 20,
      side: 'center',
    });
  });

  it('never goes above the top inset even when the card is taller than the safe area', () => {
    const tinyViewport = { width: 390, height: 220 };
    const hole = { x: 120, y: 100, width: 120, height: 60 };
    expect(placeCard(hole, card, tinyViewport, opts).top).toBe(75);
  });

  it('clamps the horizontal position to the margins', () => {
    const leftHole = { x: 0, y: 200, width: 40, height: 44 };
    const rightHole = { x: 370, y: 200, width: 20, height: 44 };
    expect(placeCard(leftHole, card, viewport, opts).left).toBe(16);
    expect(placeCard(rightHole, card, viewport, opts).left).toBe(54);
  });

  it('falls back to the left margin when the card is wider than the viewport', () => {
    const narrow = { width: 300, height: 844 };
    const hole = { x: 100, y: 200, width: 40, height: 44 };
    expect(placeCard(hole, card, narrow, opts).left).toBe(16);
  });
});

describe('padRect', () => {
  it('expands the rect by the padding on every side', () => {
    expect(padRect({ x: 50, y: 60, width: 100, height: 40 }, 6, viewport)).toEqual({
      x: 44,
      y: 54,
      width: 112,
      height: 52,
    });
  });

  it('never leaves the viewport', () => {
    expect(padRect({ x: 2, y: 840, width: 386, height: 10 }, 6, viewport)).toEqual({
      x: 0,
      y: 834,
      width: 390,
      height: 10,
    });
  });
});

describe('isRectUsable', () => {
  it('rejects missing, empty and off-screen rects', () => {
    expect(isRectUsable(null, viewport)).toBe(false);
    expect(isRectUsable({ x: 10, y: 10, width: 0, height: 20 }, viewport)).toBe(false);
    expect(isRectUsable({ x: 400, y: 10, width: 20, height: 20 }, viewport)).toBe(false);
    expect(isRectUsable({ x: 10, y: -30, width: 20, height: 20 }, viewport)).toBe(false);
  });

  it('accepts a rect that overlaps the viewport', () => {
    expect(isRectUsable({ x: 380, y: 10, width: 20, height: 20 }, viewport)).toBe(true);
  });
});
