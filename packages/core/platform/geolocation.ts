import type { GeoPoint } from '../types';

export type GeolocationAdapter = {
  requestPermission(): Promise<boolean>;
  // High-accuracy fix first, low-accuracy fallback. null on denial/error/timeout.
  getCurrentPosition(): Promise<GeoPoint | null>;
};
