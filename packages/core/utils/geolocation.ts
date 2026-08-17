import type { GeoPoint } from '../types';
import { getPlatform } from '../platform';

export const requestLocationPermission = async (): Promise<boolean> =>
  getPlatform().geolocation.requestPermission();

const CACHE_KEY = 'lastKnownLocation:v1';
const CACHE_TTL_MS = 10 * 60_000;

type CachedLocation = {
  location: GeoPoint;
  timestamp: number;
};

const readCache = async (): Promise<CachedLocation | null> => {
  try {
    const raw = await getPlatform().storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      !parsed ||
      typeof parsed.timestamp !== 'number' ||
      typeof parsed.location?.latitude !== 'number' ||
      typeof parsed.location?.longitude !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = async (location: GeoPoint): Promise<void> => {
  try {
    const payload: CachedLocation = { location, timestamp: Date.now() };
    await getPlatform().storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* storage errors are non-fatal for a cache */
  }
};

const refreshInBackground = (): void => {
  getPlatform()
    .geolocation.getCurrentPosition()
    .then(fresh => {
      if (fresh) writeCache(fresh);
    })
    .catch(() => {});
};

export const getLastKnownLocationFast = async (): Promise<GeoPoint | null> => {
  const cached = await readCache();
  return cached?.location ?? null;
};

export async function getCurrentLocation(): Promise<GeoPoint | null> {
  const cached = await readCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    refreshInBackground();
    return cached.location;
  }
  const fresh = await getPlatform().geolocation.getCurrentPosition();
  if (fresh) await writeCache(fresh);
  return fresh ?? cached?.location ?? null;
}

export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const earthRadiusMeters = 6371000;

  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}
