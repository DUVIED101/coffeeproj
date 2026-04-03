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

export async function getCurrentLocation(): Promise<GeoPoint | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
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
