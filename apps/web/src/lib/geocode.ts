import type { CityCode } from "@bystrobarista/core/types/city";
import {
  geocodeAddressWith,
  type GeocodeOutcome,
} from "@bystrobarista/core/utils/geocode";

export type {
  GeocodeOutcome,
  GeocodeResult,
} from "@bystrobarista/core/utils/geocode";

export const geocodeAddress = (
  addressLine: string,
  city: CityCode,
  signal?: AbortSignal,
): Promise<GeocodeOutcome> =>
  geocodeAddressWith(
    { apiKey: process.env.NEXT_PUBLIC_YANDEX_GEOCODER_API_KEY },
    addressLine,
    city,
    signal,
  );
