import * as Sentry from '@sentry/react-native';
import { YANDEX_GEOCODER_API_KEY } from '@env';
import type { CityCode } from '@bystrobarista/core/types/city';
import {
  geocodeAddressWith,
  type GeocodeOutcome,
} from '@bystrobarista/core/utils/geocode';

export type {
  GeocodeOutcome,
  GeocodeResult,
} from '@bystrobarista/core/utils/geocode';
export { parseFirstValidHit } from '@bystrobarista/core/utils/geocode';

export const geocodeAddress = (
  addressLine: string,
  city: CityCode,
  signal?: AbortSignal
): Promise<GeocodeOutcome> =>
  geocodeAddressWith(
    {
      apiKey: YANDEX_GEOCODER_API_KEY,
      onError: (kind, detail) => {
        if (kind === 'http') {
          Sentry.captureMessage(`Yandex Geocoder HTTP ${detail.status}`, {
            level: 'error',
            extra: { city: detail.city, status: detail.status, body: detail.body },
          });
        } else {
          Sentry.captureException(detail.error, { extra: { city: detail.city } });
        }
      },
    },
    addressLine,
    city,
    signal
  );
