import Geolocation from 'react-native-geolocation-service';
import { Platform } from 'react-native';
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
        console.log('📍 getCurrentLocation: fix acquired', {
          accuracy: position.coords.accuracy,
          highAccuracy: opts.enableHighAccuracy,
        });
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        // Log the iOS error code/message so we can see WHY a fix failed —
        // timeout, permission denied, position unavailable, etc.
        console.warn('📍 getCurrentLocation: error', {
          highAccuracy: opts.enableHighAccuracy,
          code: (error as { code?: number }).code,
          message: (error as { message?: string }).message,
        });
        resolve(null);
      },
      { ...opts, maximumAge: 60_000 }
    );
  });

// Try a high-accuracy fix first; if it times out (common on cold-start indoors)
// fall back to a coarse fix which usually returns instantly from cached cell /
// wifi data. Total worst-case wait ~25s, vs. the previous hard 10s timeout
// that left userLocation undefined and removed the distance from the feed.
export async function getCurrentLocation(): Promise<GeoPoint | null> {
  const highAccuracy = await fetchPosition({ enableHighAccuracy: true, timeout: 15_000 });
  if (highAccuracy) return highAccuracy;
  return fetchPosition({ enableHighAccuracy: false, timeout: 10_000 });
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
