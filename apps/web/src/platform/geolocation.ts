import type { GeolocationAdapter } from "@bystrobarista/core/platform/geolocation";
import type { GeoPoint } from "@bystrobarista/core/types";

const HIGH_ACCURACY_TIMEOUT_MS = 5_000;
const LOW_ACCURACY_TIMEOUT_MS = 5_000;

const fetchPosition = (opts: {
  enableHighAccuracy: boolean;
  timeout: number;
}): Promise<GeoPoint | null> =>
  new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { ...opts, maximumAge: 60_000 },
    );
  });

export const webGeolocation: GeolocationAdapter = {
  async requestPermission() {
    // Browsers have no standalone permission request — the prompt fires on
    // the first getCurrentPosition call. Report current state if queryable.
    if (!("geolocation" in navigator)) return false;
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      return status.state !== "denied";
    } catch {
      return true;
    }
  },

  async getCurrentPosition() {
    const high = await fetchPosition({
      enableHighAccuracy: true,
      timeout: HIGH_ACCURACY_TIMEOUT_MS,
    });
    if (high) return high;
    return fetchPosition({
      enableHighAccuracy: false,
      timeout: LOW_ACCURACY_TIMEOUT_MS,
    });
  },
};
