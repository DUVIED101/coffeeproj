import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import type { GeolocationAdapter } from '@bystrobarista/core/platform/geolocation';
import type { GeoPoint } from '@bystrobarista/core/types';

type FixAttemptOptions = {
  enableHighAccuracy: boolean;
  timeout: number;
};

const HIGH_ACCURACY_TIMEOUT_MS = 5_000;
const LOW_ACCURACY_TIMEOUT_MS = 5_000;

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

export const nativeGeolocation: GeolocationAdapter = {
  async requestPermission() {
    if (Platform.OS !== 'ios') return false;
    try {
      const authorization = await Geolocation.requestAuthorization('whenInUse');
      return authorization === 'granted';
    } catch {
      return false;
    }
  },

  async getCurrentPosition() {
    const high = await fetchPosition({
      enableHighAccuracy: true,
      timeout: HIGH_ACCURACY_TIMEOUT_MS,
    });
    if (high) return high;
    return fetchPosition({ enableHighAccuracy: false, timeout: LOW_ACCURACY_TIMEOUT_MS });
  },
};
