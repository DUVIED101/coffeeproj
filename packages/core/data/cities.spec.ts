import { readFileSync } from 'fs';
import { join } from 'path';
import metroData from './metro-stations.json';
import { CITIES } from './cities';
import { PINNED_CITY_CODES, isInsideBounds } from '../types/city';

const CODE_PATTERN = /^[a-z][a-z0-9_]{1,40}$/;

describe('CITIES dataset', () => {
  it('lists the 171 Russian cities with 100 000+ residents (Rosstat, 1 Jan 2025)', () => {
    expect(CITIES).toHaveLength(171);
  });

  it('uses unique snake_case codes and unique Russian names', () => {
    const codes = CITIES.map(city => city.code);
    const names = CITIES.map(city => city.nameRu);

    expect(codes.filter(code => !CODE_PATTERN.test(code))).toEqual([]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every city centre inside its own bounds', () => {
    const outside = CITIES.filter(
      city => !isInsideBounds(city.latitude, city.longitude, city.bounds)
    ).map(city => city.code);

    expect(outside).toEqual([]);
  });

  it('has bounds wide enough to geocode and narrow enough to stay one city', () => {
    const odd = CITIES.filter(city => {
      const dLat = city.bounds.maxLat - city.bounds.minLat;
      const dLon = city.bounds.maxLon - city.bounds.minLon;
      return dLat < 0.05 || dLon < 0.05 || dLat > 1.4 || dLon > 2.5;
    }).map(city => city.code);

    expect(odd).toEqual([]);
  });

  it('only counts residents in the 100 000+ range', () => {
    expect(CITIES.filter(city => city.population < 100_000).map(city => city.code)).toEqual([]);
  });

  it('pins exactly the cities that have metro station data', () => {
    expect([...Object.keys(metroData)].sort()).toEqual([...PINNED_CITY_CODES].sort());
  });

  it('matches the committed SQL seed row for row', () => {
    const seed = readFileSync(join(__dirname, 'cities.seed.sql'), 'utf8');
    const seededRows = [...seed.matchAll(/\('([a-z0-9_]+)', '[^']*', '[^']*', (true|false),/g)].map(
      match => `${match[1]}:${match[2]}`
    );
    const expected = CITIES.map(city => `${city.code}:${PINNED_CITY_CODES.includes(city.code)}`);

    expect(seededRows).toEqual(expected);
  });
});
