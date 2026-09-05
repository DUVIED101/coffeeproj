export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
export type VerticalInsets = { top: number; bottom: number };

export type CardSide = 'below' | 'above' | 'center';
export type CardPlacement = { top: number; left: number; side: CardSide };

export type PlaceCardOptions = { gap: number; margin: number; insets: VerticalInsets };

const clamp = (value: number, min: number, max: number): number =>
  max < min ? min : Math.min(Math.max(value, min), max);

export const placeCard = (
  hole: Rect,
  card: Size,
  viewport: Size,
  { gap, margin, insets }: PlaceCardOptions
): CardPlacement => {
  const left = clamp(
    hole.x + hole.width / 2 - card.width / 2,
    margin,
    viewport.width - margin - card.width
  );
  const minTop = insets.top + margin;
  const maxBottom = viewport.height - insets.bottom - margin;

  const belowTop = hole.y + hole.height + gap;
  if (belowTop + card.height <= maxBottom) return { top: belowTop, left, side: 'below' };

  const aboveTop = hole.y - gap - card.height;
  if (aboveTop >= minTop) return { top: aboveTop, left, side: 'above' };

  // Neither side fits (tall anchor): hug the bottom of the safe area so the
  // top of the highlighted element stays visible.
  return {
    top: clamp(maxBottom - card.height, minTop, maxBottom - card.height),
    left,
    side: 'center',
  };
};

export const padRect = (rect: Rect, padding: number, viewport: Size): Rect => {
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  const right = Math.min(viewport.width, rect.x + rect.width + padding);
  const bottom = Math.min(viewport.height, rect.y + rect.height + padding);
  return { x, y, width: right - x, height: bottom - y };
};

export const isRectUsable = (rect: Rect | null | undefined, viewport: Size): boolean => {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  const overlapsX = rect.x < viewport.width && rect.x + rect.width > 0;
  const overlapsY = rect.y < viewport.height && rect.y + rect.height > 0;
  return overlapsX && overlapsY;
};
