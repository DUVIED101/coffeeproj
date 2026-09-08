import { CITIES } from '../data/cities';
import { PINNED_CITY_CODES } from '../types/city';
import { listCitiesForPicker, searchCities } from './cities';

describe('listCitiesForPicker', () => {
  it('returns the pinned cities in the fixed order', () => {
    expect(listCitiesForPicker().pinned.map(city => city.code)).toEqual(PINNED_CITY_CODES);
  });

  it('returns every other city sorted by Russian name, starting with Абакан', () => {
    const rest = listCitiesForPicker().rest.map(city => city.nameRu);

    expect(rest.slice(0, 3)).toEqual(['Абакан', 'Альметьевск', 'Ангарск']);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'ru')));
    expect(rest).toHaveLength(CITIES.length - PINNED_CITY_CODES.length);
  });
});

describe('searchCities', () => {
  it('returns the full pinned-then-alphabetical list for an empty query', () => {
    const codes = searchCities('  ').map(city => city.code);

    expect(codes.slice(0, PINNED_CITY_CODES.length)).toEqual(PINNED_CITY_CODES);
    expect(codes).toHaveLength(CITIES.length);
  });

  it('matches a prefix of any word in the Russian name', () => {
    expect(searchCities('новг').map(city => city.code)).toEqual([
      'nizhny_novgorod',
      'veliky_novgorod',
    ]);
  });

  it('ignores case and the ё/е difference', () => {
    expect(searchCities('ОРЕЛ').map(city => city.code)).toEqual(['oryol']);
  });

  it('matches the English name too', () => {
    expect(searchCities('Yekat').map(city => city.code)).toEqual(['yekaterinburg']);
  });

  it('returns nothing for a query that matches no city', () => {
    expect(searchCities('zzz')).toEqual([]);
  });
});
