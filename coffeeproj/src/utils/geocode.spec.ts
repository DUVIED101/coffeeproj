import { geocodeAddress, parseFirstValidHit } from './geocode';
import { CITY_BOUNDS } from '../types/city';

type FetchMock = jest.Mock<Promise<{ json: () => Promise<unknown> }>>;

const buildResponse = (data: unknown) => ({ json: async () => data });

const setFetchResponses = (responses: ReadonlyArray<unknown>) => {
  const mock = global.fetch as unknown as FetchMock;
  mock.mockReset();
  for (const r of responses) mock.mockResolvedValueOnce(buildResponse(r));
};

beforeAll(() => {
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('parseFirstValidHit', () => {
  const spbBounds = CITY_BOUNDS.spb;
  const nevskyHit = {
    lat: '59.9343',
    lon: '30.3351',
    class: 'highway',
    type: 'primary',
    address: { road: 'Невский проспект' },
  };
  const moscowBuildingHit = {
    lat: '55.7558',
    lon: '37.6173',
    class: 'building',
    type: 'apartments',
    address: { road: 'Тверская улица', house_number: '7' },
  };

  it('returns coords when hit has address.road and is inside city bounds', () => {
    const result = parseFirstValidHit([nevskyHit], spbBounds);
    expect(result).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект',
    });
  });

  it('returns coords with composed "street, house" for buildings inside city bounds', () => {
    const result = parseFirstValidHit([moscowBuildingHit], CITY_BOUNDS.moscow);
    expect(result).toEqual({
      latitude: 55.7558,
      longitude: 37.6173,
      formattedAddress: 'Тверская улица, 7',
    });
  });

  it('returns null when hit is a "place/locality" without a road', () => {
    const localityHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'place',
      type: 'locality',
      address: {},
    };
    expect(parseFirstValidHit([localityHit], spbBounds)).toBeNull();
  });

  it('returns null for class=amenity (POI by name — cafe/restaurant/etc.)', () => {
    const cafeHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'amenity',
      type: 'cafe',
      display_name: 'Coffee Place, Невский проспект, Санкт-Петербург',
      address: { road: 'Невский проспект', house_number: '12' },
    };
    expect(parseFirstValidHit([cafeHit], spbBounds)).toBeNull();
  });

  it('returns null for class=shop (POI by brand/store name)', () => {
    const shopHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'shop',
      type: 'coffee',
      address: { road: 'Невский проспект', house_number: '5' },
    };
    expect(parseFirstValidHit([shopHit], spbBounds)).toBeNull();
  });

  it('returns null for class=tourism (hotels, attractions)', () => {
    const tourismHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'tourism',
      type: 'hotel',
      address: { road: 'Невский проспект', house_number: '10' },
    };
    expect(parseFirstValidHit([tourismHit], spbBounds)).toBeNull();
  });

  it('returns null for class=leisure (parks, gyms, etc.)', () => {
    const leisureHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'leisure',
      type: 'park',
      address: { road: 'Невский проспект' },
    };
    expect(parseFirstValidHit([leisureHit], spbBounds)).toBeNull();
  });

  it('returns null for class=building without a road (unaddressed)', () => {
    const buildingHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'building',
      type: 'yes',
      address: {},
    };
    expect(parseFirstValidHit([buildingHit], spbBounds)).toBeNull();
  });

  it('returns null when coordinates fall outside the selected city bbox', () => {
    const moscowPointForSpbRequest = {
      lat: '55.7558',
      lon: '37.6173',
      class: 'highway',
      type: 'primary',
      address: { road: 'Тверская улица' },
    };
    expect(parseFirstValidHit([moscowPointForSpbRequest], spbBounds)).toBeNull();
  });

  it('returns null when data is an empty array', () => {
    expect(parseFirstValidHit([], spbBounds)).toBeNull();
  });

  it('returns null when data is not an array', () => {
    expect(parseFirstValidHit({} as unknown, spbBounds)).toBeNull();
  });

  it('returns null when lat/lon are not finite numbers', () => {
    const badHit = {
      lat: 'not-a-number',
      lon: '30.3351',
      class: 'highway',
      address: { road: 'X' },
    };
    expect(parseFirstValidHit([badHit], spbBounds)).toBeNull();
  });

  it('returns null for class=place type=country (Russia-wide fallback)', () => {
    const countryHit = {
      lat: '60.0',
      lon: '30.0',
      class: 'place',
      type: 'country',
      address: {},
    };
    expect(parseFirstValidHit([countryHit], spbBounds)).toBeNull();
  });

  it('accepts class=place type=house even without address.road', () => {
    const houseHit = {
      lat: '59.95',
      lon: '30.35',
      class: 'place',
      type: 'house',
      address: {},
    };
    expect(parseFirstValidHit([houseHit], spbBounds)).toEqual({
      latitude: 59.95,
      longitude: 30.35,
      formattedAddress: '',
    });
  });

  it('skips a leading POI hit and returns the next address-shaped hit', () => {
    const cafeHit = {
      lat: '59.9343',
      lon: '30.3351',
      class: 'amenity',
      type: 'cafe',
      address: { road: 'Невский проспект', house_number: '12' },
    };
    expect(parseFirstValidHit([cafeHit, nevskyHit], spbBounds)).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект',
    });
  });
});

describe('geocodeAddress', () => {
  it('returns coords for a valid street in СПб from the free-form query', async () => {
    setFetchResponses([
      [
        {
          lat: '59.9343',
          lon: '30.3351',
          class: 'highway',
          type: 'primary',
          address: { road: 'Невский проспект' },
        },
      ],
    ]);
    const result = await geocodeAddress('Невский проспект, 10', 'spb');
    expect(result).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект',
    });
  });

  it('falls back to the structured query when free-form returns an invalid hit', async () => {
    setFetchResponses([
      [{ lat: '60.0', lon: '30.0', class: 'place', type: 'locality', address: {} }],
      [
        {
          lat: '59.95',
          lon: '30.32',
          class: 'highway',
          type: 'residential',
          address: { road: 'Малая Морская улица', house_number: '5' },
        },
      ],
    ]);
    const result = await geocodeAddress('Малая Морская, 5', 'spb');
    expect(result).toEqual({
      latitude: 59.95,
      longitude: 30.32,
      formattedAddress: 'Малая Морская улица, 5',
    });
  });

  it('rejects a POI-named hit (amenity=cafe) and falls back to structured query', async () => {
    setFetchResponses([
      [
        {
          lat: '59.94',
          lon: '30.31',
          class: 'amenity',
          type: 'cafe',
          address: { road: 'Невский проспект', house_number: '12' },
        },
      ],
      [
        {
          lat: '59.9343',
          lon: '30.3351',
          class: 'highway',
          type: 'primary',
          address: { road: 'Невский проспект' },
        },
      ],
    ]);
    const result = await geocodeAddress('Кофейня имени Невского', 'spb');
    expect(result).toEqual({
      latitude: 59.9343,
      longitude: 30.3351,
      formattedAddress: 'Невский проспект',
    });
  });

  it('returns null when Nominatim returns "Сука"-style locality hit and structured query also fails', async () => {
    setFetchResponses([
      [{ lat: '55.81', lon: '37.45', class: 'place', type: 'locality', address: {} }],
      [],
    ]);
    const result = await geocodeAddress('Сука', 'spb');
    expect(result).toBeNull();
  });

  it('returns null when Nominatim returns Moscow coords for an СПб query', async () => {
    setFetchResponses([
      [
        {
          lat: '55.7558',
          lon: '37.6173',
          class: 'highway',
          type: 'primary',
          address: { road: 'Тверская улица' },
        },
      ],
      [],
    ]);
    const result = await geocodeAddress('Тверская, 7', 'spb');
    expect(result).toBeNull();
  });

  it('returns null when both queries return empty arrays', async () => {
    setFetchResponses([[], []]);
    expect(await geocodeAddress('whatever', 'moscow')).toBeNull();
  });
});
