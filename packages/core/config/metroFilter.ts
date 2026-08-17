/**
 * Sentinel that lives in `preferredMetroStations` arrays to mean "the barista
 * has explicitly said: any station, no preference". Distinct from `[]` which
 * just means "user hasn't filled this in yet". Filter callers (FilterBar)
 * strip it before applying so it never reaches downstream search logic.
 */
export const METRO_ANY = '__any__';

export const isMetroAnySelection = (stations: readonly string[]): boolean =>
  stations.length === 1 && stations[0] === METRO_ANY;
