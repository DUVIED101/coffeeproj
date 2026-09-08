import type { CityCode } from '../types/city';
import { MetroService } from '../utils/metro';

/**
 * Sentinel that lives in `preferredMetroStations` arrays to mean "the barista
 * has explicitly said: any station, no preference". Distinct from `[]` which
 * just means "user hasn't filled this in yet". Filter callers (FilterBar)
 * strip it before applying so it never reaches downstream search logic.
 */
export const METRO_ANY = '__any__';

export const isMetroAnySelection = (stations: readonly string[]): boolean =>
  stations.length === 1 && stations[0] === METRO_ANY;

/**
 * Cities without a metro can never pick a station, so the profile stores the
 * "any station" sentinel instead of an empty array — that keeps the DB
 * completeness trigger (which only checks for a non-empty array) satisfied.
 */
export const normalizePreferredMetroStations = (
  city: CityCode,
  stations: readonly string[]
): string[] => (MetroService.hasMetro(city) ? [...stations] : [METRO_ANY]);
