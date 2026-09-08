import {
  CITY_BOUNDS,
  CITY_LABELS_RU,
  DEFAULT_CITY,
  PINNED_CITY_CODES,
  getCityLabel,
  isCityCode,
  toCityCode,
} from './city';

describe('isCityCode', () => {
  it('accepts every code from the dataset and rejects anything else', () => {
    expect(isCityCode('kazan')).toBe(true);
    expect(isCityCode('spb')).toBe(true);
    expect(isCityCode('kzn')).toBe(false);
    expect(isCityCode(undefined)).toBe(false);
  });
});

describe('toCityCode', () => {
  it('falls back to Saint Petersburg for unknown input', () => {
    expect(toCityCode('bogus')).toBe(DEFAULT_CITY);
    expect(toCityCode(null)).toBe('spb');
    expect(toCityCode('novosibirsk')).toBe('novosibirsk');
  });
});

describe('getCityLabel', () => {
  it('returns the English name for en-* locales and Russian otherwise', () => {
    expect(getCityLabel('kazan', 'en-US')).toBe('Kazan');
    expect(getCityLabel('kazan', 'ru')).toBe('Казань');
    expect(getCityLabel('nizhny_novgorod', 'en')).toBe('Nizhny Novgorod');
  });
});

describe('city constants', () => {
  it('keeps the legacy labels and geocoder bounds for the two original cities', () => {
    expect(CITY_LABELS_RU.spb).toBe('Санкт-Петербург');
    expect(CITY_LABELS_RU.moscow).toBe('Москва');
    expect(CITY_BOUNDS.spb).toEqual({
      minLat: 59.63,
      maxLat: 60.25,
      minLon: 29.55,
      maxLon: 30.8,
    });
    expect(CITY_BOUNDS.moscow).toEqual({
      minLat: 55.12,
      maxLat: 56.38,
      minLon: 36.5,
      maxLon: 38.74,
    });
  });

  it('pins the capitals first, then the five other metro cities', () => {
    expect(PINNED_CITY_CODES).toEqual([
      'moscow',
      'spb',
      'nizhny_novgorod',
      'kazan',
      'novosibirsk',
      'samara',
      'yekaterinburg',
    ]);
  });
});
