import { CITIES } from '../data/cities';

export type CityEntry = (typeof CITIES)[number];

export type CityCode = CityEntry['code'];

export const CITY_CODES: readonly CityCode[] = CITIES.map(city => city.code);

export const DEFAULT_CITY: CityCode = 'spb';

/** Shown first in every city picker: the two capitals, then the other metro cities. */
export const PINNED_CITY_CODES: readonly CityCode[] = [
  'moscow',
  'spb',
  'nizhny_novgorod',
  'kazan',
  'novosibirsk',
  'samara',
  'yekaterinburg',
];

export const CITY_BY_CODE = Object.fromEntries(CITIES.map(city => [city.code, city])) as Record<
  CityCode,
  CityEntry
>;

export const CITY_LABELS_RU = Object.fromEntries(
  CITIES.map(city => [city.code, city.nameRu])
) as Record<CityCode, string>;

export const CITY_LABELS_EN = Object.fromEntries(
  CITIES.map(city => [city.code, city.nameEn])
) as Record<CityCode, string>;

const CITY_CODE_SET: ReadonlySet<string> = new Set(CITY_CODES);

export const isCityCode = (value: unknown): value is CityCode =>
  typeof value === 'string' && CITY_CODE_SET.has(value);

export const toCityCode = (value: unknown): CityCode => {
  if (isCityCode(value)) return value;
  return DEFAULT_CITY;
};

export const getCityLabel = (code: CityCode, language: string): string =>
  language.toLowerCase().startsWith('en') ? CITY_LABELS_EN[code] : CITY_LABELS_RU[code];

export type CityBounds = {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
};

export const CITY_BOUNDS = Object.fromEntries(
  CITIES.map(city => [city.code, city.bounds])
) as Record<CityCode, CityBounds>;

export const isInsideBounds = (lat: number, lon: number, bounds: CityBounds): boolean =>
  lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
