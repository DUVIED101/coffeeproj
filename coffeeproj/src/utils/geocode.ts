import type { GeoPoint } from '../types/business';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 10_000;

const parseFirstHit = (data: unknown): GeoPoint | null => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { latitude: lat, longitude: lon };
};

export const geocodeAddress = async (
  addressLine: string,
  cityLine: string,
  signal?: AbortSignal
): Promise<GeoPoint | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const headers = { 'User-Agent': 'CoffeeProj/1.0' };
  const fetchOpts = { headers, signal: controller.signal };

  const freeFormQ = encodeURIComponent(`${addressLine}, ${cityLine}, Russia`);
  const structuredQ = `street=${encodeURIComponent(addressLine)}&city=${encodeURIComponent(
    cityLine
  )}&country=Russia&countrycodes=ru`;

  try {
    const freeForm = await fetch(
      `${NOMINATIM_URL}?q=${freeFormQ}&format=json&limit=1&countrycodes=ru`,
      fetchOpts
    );
    const hit = parseFirstHit(await freeForm.json());
    if (hit) return hit;

    if (controller.signal.aborted) return null;

    const structured = await fetch(
      `${NOMINATIM_URL}?${structuredQ}&format=json&limit=1`,
      fetchOpts
    );
    return parseFirstHit(await structured.json());
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Geocoding error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
};
