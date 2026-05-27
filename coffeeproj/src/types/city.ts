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
