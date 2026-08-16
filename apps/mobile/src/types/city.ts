export type CityCode = 'spb' | 'moscow';

export const CITY_CODES: readonly CityCode[] = ['spb', 'moscow'] as const;

export const DEFAULT_CITY: CityCode = 'spb';

export const CITY_LABELS_RU: Record<CityCode, string> = {
  spb: 'Санкт-Петербург',
  moscow: 'Москва',
};

export const CITY_LABELS_EN: Record<CityCode, string> = {
  spb: 'Saint Petersburg',
  moscow: 'Moscow',
};

export const CITY_SHORT_LABELS_RU: Record<CityCode, string> = {
  spb: 'Санкт-Петербург',
  moscow: 'Москва',
};

export const isCityCode = (value: unknown): value is CityCode =>
  typeof value === 'string' && (CITY_CODES as readonly string[]).includes(value);

export const toCityCode = (value: unknown): CityCode => {
  if (isCityCode(value)) return value;
  return DEFAULT_CITY;
};

export type CityBounds = {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
};

export const CITY_BOUNDS: Record<CityCode, CityBounds> = {
  spb: { minLat: 59.63, maxLat: 60.25, minLon: 29.55, maxLon: 30.8 },
  moscow: { minLat: 55.12, maxLat: 56.38, minLon: 36.5, maxLon: 38.74 },
};

export const isInsideBounds = (lat: number, lon: number, bounds: CityBounds): boolean =>
  lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
