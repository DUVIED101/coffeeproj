import { YANDEX_GEOCODER_API_KEY } from '@env';
import type { GeoPoint } from '../types/business';
import type { CityBounds, CityCode } from '../types/city';
import { CITY_BOUNDS, CITY_LABELS_RU, isInsideBounds } from '../types/city';

// Yandex Geocoder API — https://yandex.ru/dev/maps/geocoder/
// Apply for a key at https://developer.tech.yandex.ru/ (free tier:
// 25 000 requests/day). Replaces the previous Nominatim integration.
const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';
const REQUEST_TIMEOUT_MS = 10_000;

export type GeocodeResult = GeoPoint & { formattedAddress: string };

type YandexGeoObject = {
  Point?: { pos?: string };
  metaDataProperty?: {
    GeocoderMetaData?: {
      kind?: string;
      text?: string;
      Address?: {
        formatted?: string;
        Components?: Array<{ kind?: string; name?: string }>;
      };
    };
  };
};

type YandexResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{ GeoObject?: YandexGeoObject }>;
    };
  };
};

// Yandex's `kind` describes the precision. We want street- or house-level
// hits — never region/locality/country (which are too coarse for branch
// addresses).
const ADDRESS_KINDS: ReadonlySet<string> = new Set(['house', 'street']);

const findComponent = (obj: YandexGeoObject, kind: string): string | undefined => {
  return obj.metaDataProperty?.GeocoderMetaData?.Address?.Components?.find(c => c.kind === kind)
    ?.name;
};

// Build a short, Russian address from the response.
//
// Yandex returns `text` in the language requested via `lang=ru_RU` (e.g.
// "Россия, Санкт-Петербург, Невский проспект, 22"), while
// `Address.Components[].name` keeps the original toponym language and can
// echo back English when the user typed transliterated input. Prefer `text`
// and strip the country + city prefix so the result is "Невский проспект, 22".
const composeFormattedAddress = (obj: YandexGeoObject, cityLine: string): string => {
  const text = obj.metaDataProperty?.GeocoderMetaData?.text ?? '';
  if (text) {
    const parts = text
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const trimmed = parts.filter(p => p !== 'Россия' && p !== cityLine);
    if (trimmed.length > 0) return trimmed.join(', ');
    return text;
  }
  const street = findComponent(obj, 'street');
  const house = findComponent(obj, 'house');
  if (street && house) return `${street}, ${house}`;
  if (street) return street;
  return '';
};

const toResult = (
  obj: YandexGeoObject,
  bounds: CityBounds,
  cityLine: string
): GeocodeResult | null => {
  const pos = obj.Point?.pos;
  if (!pos) return null;
  // Yandex returns "lon lat" (note the order — opposite of Nominatim).
  const [lonStr, latStr] = pos.split(' ');
  const lat = parseFloat(latStr ?? '');
  const lon = parseFloat(lonStr ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!isInsideBounds(lat, lon, bounds)) return null;

  const kind = obj.metaDataProperty?.GeocoderMetaData?.kind;
  if (!kind || !ADDRESS_KINDS.has(kind)) return null;
  // Street-level kind must include a street component; otherwise it's a
  // route or boulevard segment with no address shape.
  if (kind === 'street' && !findComponent(obj, 'street')) return null;

  return {
    latitude: lat,
    longitude: lon,
    formattedAddress: composeFormattedAddress(obj, cityLine),
  };
};

export const parseFirstValidHit = (
  data: unknown,
  bounds: CityBounds,
  cityLine: string
): GeocodeResult | null => {
  const featureMember =
    (data as YandexResponse)?.response?.GeoObjectCollection?.featureMember ?? [];
  for (const item of featureMember) {
    const obj = item?.GeoObject;
    if (!obj) continue;
    const result = toResult(obj, bounds, cityLine);
    if (result) return result;
  }
  return null;
};

// Yandex bbox is `lon1,lat1~lon2,lat2` — lon-first, tilde-separated.
const buildBbox = (bounds: CityBounds): string =>
  `${bounds.minLon},${bounds.minLat}~${bounds.maxLon},${bounds.maxLat}`;

export const geocodeAddress = async (
  addressLine: string,
  city: CityCode,
  signal?: AbortSignal
): Promise<GeocodeResult | null> => {
  if (!YANDEX_GEOCODER_API_KEY) {
    console.error('Geocoding error: YANDEX_GEOCODER_API_KEY is not set in .env');
    return null;
  }

  const bounds = CITY_BOUNDS[city];
  const cityLine = CITY_LABELS_RU[city];
  const bbox = buildBbox(bounds);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const fetchOpts = { signal: controller.signal };
  const commonParams =
    `apikey=${encodeURIComponent(YANDEX_GEOCODER_API_KEY)}` +
    `&format=json&lang=ru_RU&results=5` +
    `&bbox=${encodeURIComponent(bbox)}&rspn=1` +
    `&kind=house`;

  const freeFormQ = encodeURIComponent(`${cityLine}, ${addressLine}`);

  try {
    const res = await fetch(
      `${YANDEX_GEOCODER_URL}?geocode=${freeFormQ}&${commonParams}`,
      fetchOpts
    );
    if (!res.ok) {
      console.error('Yandex Geocoder HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    return parseFirstValidHit(await res.json(), bounds, cityLine);
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Geocoding error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
};
