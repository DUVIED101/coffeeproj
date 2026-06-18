export const BREAKPOINTS = {
  tablet: 768,
  wide: 1024,
} as const;

export type LayoutClass = 'phone' | 'tablet' | 'wide';

export const classifyWidth = (width: number): LayoutClass => {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

export const isCompactWidth = (width: number): boolean => width < BREAKPOINTS.tablet;
