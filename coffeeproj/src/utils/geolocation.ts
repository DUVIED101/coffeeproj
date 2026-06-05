import Geolocation from 'react-native-geolocation-service';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeoPoint } from '../types';

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const authorization = await Geolocation.requestAuthorization('whenInUse');
    return authorization === 'granted';
  } catch {
    return false;
  }
}

type FixAttemptOptions = {
  enableHighAccuracy: boolean;
  timeout: number;
};

const fetchPosition = (opts: FixAttemptOptions): Promise<GeoPoint | null> =>
  new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { ...opts, maximumAge: 60_000 }
    );
  });

const CACHE_KEY = 'lastKnownLocation:v1';
const CACHE_TTL_MS = 10 * 60_000;
const HIGH_ACCURACY_TIMEOUT_MS = 5_000;
const LOW_ACCURACY_TIMEOUT_MS = 5_000;

type CachedLocation = {
  location: GeoPoint;
  timestamp: number;
};

const readCache = async (): Promise<CachedLocation | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
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
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* AsyncStorage errors are non-fatal for a cache */
  }
};

const fetchFreshLocation = async (): Promise<GeoPoint | null> => {
  const high = await fetchPosition({
    enableHighAccuracy: true,
    timeout: HIGH_ACCURACY_TIMEOUT_MS,
  });
  if (high) return high;
  return fetchPosition({ enableHighAccuracy: false, timeout: LOW_ACCURACY_TIMEOUT_MS });
};

const refreshInBackground = (): void => {
  fetchFreshLocation()
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
  const fresh = await fetchFreshLocation();
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
