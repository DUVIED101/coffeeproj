import { parseFirstValidHit } from './geocode';
import { CITY_BOUNDS, CITY_LABELS_RU } from '../types/city';

const SPB = CITY_LABELS_RU.spb;
const MOSCOW = CITY_LABELS_RU.moscow;

// Build a synthetic Yandex Geocoder response with one or more GeoObjects.
const yandexResponse = (geoObjects: Array<Record<string, unknown>>) => ({
  response: {
    GeoObjectCollection: {
      featureMember: geoObjects.map(g => ({ GeoObject: g })),
    },
  },
});

// Yandex's `text` field is the full Russian-formatted address, e.g.
// "Россия, Санкт-Петербург, Невский проспект, 22". `Components[]` mirrors
// the canonical structured form; we keep both in fixtures so the parser
// can choose either source.
const houseGeoObject = (
  lat: number,
  lon: number,
  street: string,
  house: string,
  cityLine = SPB
): Record<string, unknown> => ({
  Point: { pos: `${lon} ${lat}` },
  metaDataProperty: {
    GeocoderMetaData: {
      kind: 'house',
      text: `Россия, ${cityLine}, ${street}, ${house}`,
      Address: {
        Components: [
          { kind: 'country', name: 'Россия' },
          { kind: 'locality', name: cityLine },
          { kind: 'street', name: street },
          { kind: 'house', name: house },
        ],
      },
    },
  },
});

const streetGeoObject = (
  lat: number,
  lon: number,
  street: string,
  cityLine = SPB
): Record<string, unknown> => ({
  Point: { pos: `${lon} ${lat}` },
  metaDataProperty: {
    GeocoderMetaData: {
      kind: 'street',
      text: `Россия, ${cityLine}, ${street}`,
      Address: { Components: [{ kind: 'street', name: street }] },
    },
  },
});

const localityGeoObject = (lat: number, lon: number, name: string): Record<string, unknown> => ({
  Point: { pos: `${lon} ${lat}` },
  metaDataProperty: {
    GeocoderMetaData: {
      kind: 'locality',
      text: name,
      Address: { Components: [{ kind: 'locality', name }] },
    },
  },
});

describe('parseFirstValidHit', () => {
  const spbBounds = CITY_BOUNDS.spb;

  it('returns coords for a house-kind hit inside city bounds', () => {
    const data = yandexResponse([houseGeoObject(59.9343, 30.3351, 'Невский проспект', '10')]);
    expect(parseFirstValidHit(data, spbBounds, SPB)).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект, 10',
    });
  });

  it('returns coords for a street-kind hit (no house number)', () => {
    const data = yandexResponse([streetGeoObject(59.9343, 30.3351, 'Невский проспект')]);
    expect(parseFirstValidHit(data, spbBounds, SPB)).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект',
    });
  });

  it('strips Россия + city prefix from the Yandex text field', () => {
    // Simulates a transliterated user input where Yandex echoes English in
    // Components but the `text` field still arrives in Russian (lang=ru_RU).
    const englishComponents = {
      Point: { pos: '30.3351 59.9343' },
      metaDataProperty: {
        GeocoderMetaData: {
          kind: 'house',
          text: 'Россия, Санкт-Петербург, Невский проспект, 22',
          Address: {
            Components: [
              { kind: 'country', name: 'Russia' },
              { kind: 'locality', name: 'Saint Petersburg' },
              { kind: 'street', name: 'Nevsky Avenue' },
              { kind: 'house', name: '22' },
            ],
          },
        },
      },
    };
    expect(parseFirstValidHit(yandexResponse([englishComponents]), spbBounds, SPB)).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект, 22',
    });
  });

  it('rejects a locality-kind hit (too coarse for an address)', () => {
    const data = yandexResponse([localityGeoObject(59.9343, 30.3351, SPB)]);
    expect(parseFirstValidHit(data, spbBounds, SPB)).toBeNull();
  });

  it('returns null when coordinates fall outside the requested city bbox', () => {
    // Moscow point, SPb bounds.
    const data = yandexResponse([houseGeoObject(55.7558, 37.6173, 'Тверская улица', '7', MOSCOW)]);
    expect(parseFirstValidHit(data, spbBounds, SPB)).toBeNull();
  });

  it('returns null on an empty featureMember array', () => {
    expect(parseFirstValidHit(yandexResponse([]), spbBounds, SPB)).toBeNull();
  });

  it('returns null when payload is malformed', () => {
    expect(parseFirstValidHit({}, spbBounds, SPB)).toBeNull();
  });

  it('returns null when pos has non-numeric tokens', () => {
    const broken = yandexResponse([
      {
        Point: { pos: 'not numbers' },
        metaDataProperty: {
          GeocoderMetaData: { kind: 'house', text: '', Address: { Components: [] } },
        },
      },
    ]);
    expect(parseFirstValidHit(broken, spbBounds, SPB)).toBeNull();
  });

  it('skips a leading locality hit and returns the next valid house', () => {
    const data = yandexResponse([
      localityGeoObject(59.9343, 30.3351, SPB),
      houseGeoObject(59.9343, 30.3351, 'Невский проспект', '10'),
    ]);
    expect(parseFirstValidHit(data, spbBounds, SPB)).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект, 10',
    });
  });
});

// Note: integration tests for `geocodeAddress` (the network-glue layer) are
// intentionally omitted. react-native-dotenv substitutes `@env` values at
// babel-compile time from the on-disk `.env`, so jest can't override the
// YANDEX_GEOCODER_API_KEY constant at runtime. The fetch wrapper itself is
// thin — URL construction, abort plumbing, JSON parsing — all of the
// interesting filtering logic lives in `parseFirstValidHit` which is
// covered exhaustively above.
