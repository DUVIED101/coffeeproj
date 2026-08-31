import type { GeoPoint } from '@bystrobarista/core/types/business';
import {
  CITY_BOUNDS,
  CITY_LABELS_RU,
  isInsideBounds,
  type CityBounds,
  type CityCode,
} from '@bystrobarista/core/types/city';

// Yandex Geocoder API — https://yandex.ru/dev/maps/geocoder/
// Apply for a key at https://developer.tech.yandex.ru/ (free tier:
// 25 000 requests/day). Replaces the previous Nominatim integration.
const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';
const REQUEST_TIMEOUT_MS = 10_000;

export type GeocodeResult = GeoPoint & { formattedAddress: string };
export type GeocodeOutcome = GeocodeResult | 'rate_limited' | null;

// Platform wrappers bind the API key (from @env on mobile, NEXT_PUBLIC_* on
// web) and an optional error reporter (Sentry on mobile).
export type GeocodeDeps = {
  apiKey: string | undefined;
  onError?: (
    kind: 'http' | 'exception',
    detail: { city: CityCode; status?: number; body?: string; error?: unknown }
  ) => void;
};

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

// Yandex's `kind` is informational only — we don't gate on it. Earlier we
// only accepted {house, street}, but valid addresses also come back as
// `entrance`, `area`, `district`, `metro`, etc., and rejecting them made the
// "address not found" message fire on real, valid input. Trust Yandex: if
// coordinates land inside the city bbox (rspn=1 + bbox already constrain
// Yandex too), accept the hit. Country/locality-level hits are filtered by
// requiring the text to have at least street-level structure (>1 segment).
const TOO_COARSE_KINDS: ReadonlySet<string> = new Set([
  'country',
  'province',
  'region',
  'area',
  'locality',
]);

const findComponent = (obj: YandexGeoObject, kind: string): string | undefined => {
  return obj.metaDataProperty?.GeocoderMetaData?.Address?.Components?.find(c => c.kind === kind)
    ?.name;
};

// Build a short address from the Yandex response.
//
// Yandex's `text` field follows the shape "<Country>, <City>, <Street>, <House>"
// (possibly with extra locality/region segments between Country and City).
// We always want the last 1-2 segments (the street + house, or just street).
// This is language-agnostic — when the user types transliterated input, Yandex
// may echo English in both Components[].name AND text, so we drop the
// country/city prefix by position, not by name match.
const composeFormattedAddress = (obj: YandexGeoObject, _cityLine: string): string => {
  const text = obj.metaDataProperty?.GeocoderMetaData?.text ?? '';
  if (text) {
    const parts = text
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return text;
    if (parts.length === 1) return parts[0]!;
    // If the last segment looks like a house number (contains a digit), keep
    // street + house. Otherwise it's a street-only hit — just the street name.
    const last = parts[parts.length - 1]!;
    const lastIsHouse = /\d/.test(last);
    if (lastIsHouse) return parts.slice(-2).join(', ');
    return last;
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
  // Reject only the truly-coarse kinds (a whole country/region/city/area
  // isn't a branch address). Everything precise enough is accepted.
  if (kind && TOO_COARSE_KINDS.has(kind)) return null;

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

// Session-scoped cache — avoids re-requesting the same address while the user
// is still on the form (e.g. city toggle back-and-forth, or closing/reopening
// the modal without changing input). Cleared when the JS runtime restarts.
const geocodeCache = new Map<string, GeocodeResult>();

export const geocodeAddressWith = async (
  deps: GeocodeDeps,
  addressLine: string,
  city: CityCode,
  signal?: AbortSignal
): Promise<GeocodeOutcome> => {
  const { apiKey, onError } = deps;
  if (!apiKey) {
    console.error('Geocoding error: Yandex geocoder API key is not set');
    return null;
  }

  const bounds = CITY_BOUNDS[city];
  const cityLine = CITY_LABELS_RU[city];
  const bbox = buildBbox(bounds);

  const cacheKey = `${city}|${addressLine.trim().toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const fetchOpts = { signal: controller.signal };
  // No `kind=house` filter — that would drop street-only results entirely.
  // Client-side toResult() already filters by ADDRESS_KINDS = {house, street}.
  const commonParams =
    `apikey=${encodeURIComponent(apiKey)}` +
    `&format=json&lang=ru_RU&results=5` +
    `&bbox=${encodeURIComponent(bbox)}&rspn=1`;

  const freeFormQ = encodeURIComponent(`${cityLine}, ${addressLine}`);

  try {
    const res = await fetch(
      `${YANDEX_GEOCODER_URL}?geocode=${freeFormQ}&${commonParams}`,
      fetchOpts
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const isRateLimit = res.status === 429;
      console.error('Yandex Geocoder HTTP', res.status, body);
      if (!isRateLimit) {
        onError?.('http', { city, status: res.status, body: body.slice(0, 200) });
      }
      return isRateLimit ? 'rate_limited' : null;
    }
    const result = parseFirstValidHit(await res.json(), bounds, cityLine);
    if (result) geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Geocoding error:', error);
    onError?.('exception', { city, error });
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
};
