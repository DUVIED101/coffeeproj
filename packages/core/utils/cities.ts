import { CITIES } from '../data/cities';
import { CITY_BY_CODE, PINNED_CITY_CODES, type CityEntry } from '../types/city';

export type CityPickerSections = {
  readonly pinned: readonly CityEntry[];
  readonly rest: readonly CityEntry[];
};

const PINNED_SET: ReadonlySet<string> = new Set(PINNED_CITY_CODES);

const byRussianName = (a: CityEntry, b: CityEntry): number =>
  a.nameRu.localeCompare(b.nameRu, 'ru');

const pinnedCities: readonly CityEntry[] = PINNED_CITY_CODES.map(code => CITY_BY_CODE[code]);

const restCities: readonly CityEntry[] = CITIES.filter(city => !PINNED_SET.has(city.code)).sort(
  byRussianName
);

export const listCitiesForPicker = (): CityPickerSections => ({
  pinned: pinnedCities,
  rest: restCities,
});

const normalize = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е');

const matches = (city: CityEntry, query: string): boolean => {
  const ru = normalize(city.nameRu);
  const en = normalize(city.nameEn);
  const startsAnyWord = (name: string): boolean =>
    name.split(/[\s-]+/).some(word => word.startsWith(query));
  return startsAnyWord(ru) || startsAnyWord(en) || ru.includes(query) || en.includes(query);
};

export const searchCities = (query: string): CityEntry[] => {
  const normalized = normalize(query);
  const ordered = [...pinnedCities, ...restCities];
  if (!normalized) return ordered;
  return ordered.filter(city => matches(city, normalized));
};
