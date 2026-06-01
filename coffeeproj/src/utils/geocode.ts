import type { GeoPoint } from '../types/business';
import type { CityBounds, CityCode } from '../types/city';
import { CITY_BOUNDS, CITY_LABELS_RU, isInsideBounds } from '../types/city';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 10_000;

type NominatimHit = {
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    pedestrian?: string;
    suburb?: string;
  };
};

export type GeocodeResult = GeoPoint & { formattedAddress: string };

const composeFormattedAddress = (hit: NominatimHit): string => {
  const street = hit.address?.road ?? hit.address?.pedestrian ?? '';
  const house = hit.address?.house_number ?? '';
  if (street && house) return `${street}, ${house}`;
  if (street) return street;
  // Fallback: trim the long display_name to the first two segments, which is
  // usually "house, street" or "street, area" — still better than nothing.
  if (hit.display_name) {
    const segments = hit.display_name.split(',').map(s => s.trim());
    if (segments.length >= 2) return `${segments[1]}, ${segments[0]}`;
    return segments[0] ?? '';
  }
  return '';
};

const REJECTED_PLACE_TYPES: ReadonlySet<string> = new Set([
  'country',
  'state',
  'region',
  'county',
  'city',
  'town',
  'village',
  'locality',
  'suburb',
  'neighbourhood',
  'hamlet',
  'island',
]);

const hasValidAddressShape = (hit: NominatimHit): boolean => {
  if (typeof hit.address?.road === 'string' && hit.address.road.length > 0) {
    return true;
  }
  if (hit.class === 'building') return true;
  if (hit.class === 'highway') return true;
  if (hit.class === 'place' && hit.type === 'house') return true;
  if (hit.class === 'place' && hit.type && REJECTED_PLACE_TYPES.has(hit.type)) {
    return false;
  }
  return false;
};

export const parseFirstValidHit = (data: unknown, bounds: CityBounds): GeocodeResult | null => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0] as NominatimHit;
  const lat = parseFloat(hit.lat ?? '');
  const lon = parseFloat(hit.lon ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!isInsideBounds(lat, lon, bounds)) return null;
  if (!hasValidAddressShape(hit)) return null;
  return {
    latitude: lat,
    longitude: lon,
    formattedAddress: composeFormattedAddress(hit),
  };
};

const buildViewbox = (bounds: CityBounds): string =>
  `${bounds.minLon},${bounds.maxLat},${bounds.maxLon},${bounds.minLat}`;

export const geocodeAddress = async (
  addressLine: string,
  city: CityCode,
  signal?: AbortSignal
): Promise<GeocodeResult | null> => {
  const bounds = CITY_BOUNDS[city];
  const cityLine = CITY_LABELS_RU[city];
  const viewbox = buildViewbox(bounds);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const headers = { 'User-Agent': 'CoffeeProj/1.0' };
  const fetchOpts = { headers, signal: controller.signal };

  const commonParams = `format=json&limit=1&countrycodes=ru&addressdetails=1&viewbox=${encodeURIComponent(
    viewbox
  )}&bounded=1`;

  const freeFormQ = encodeURIComponent(`${addressLine}, ${cityLine}, Russia`);
  const structuredQ = `street=${encodeURIComponent(addressLine)}&city=${encodeURIComponent(
    cityLine
  )}&country=Russia`;

  try {
    const freeForm = await fetch(`${NOMINATIM_URL}?q=${freeFormQ}&${commonParams}`, fetchOpts);
    const hit = parseFirstValidHit(await freeForm.json(), bounds);
    if (hit) return hit;

    if (controller.signal.aborted) return null;

    const structured = await fetch(`${NOMINATIM_URL}?${structuredQ}&${commonParams}`, fetchOpts);
    return parseFirstValidHit(await structured.json(), bounds);
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Geocoding error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
};
