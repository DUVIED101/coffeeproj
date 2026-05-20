import metroData from '../data/metro-stations.json';
import type { CityCode } from '../types/city';

export interface MetroStation {
  id: string;
  name: string;
  nameEn: string;
  line: string;
  lineEn: string;
  lineColor: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface MetroLine {
  name: string;
  nameEn: string;
  color: string;
}

export interface MetroStationsData {
  spb: MetroStation[];
  moscow: MetroStation[];
}

const typedMetroData = metroData as MetroStationsData;

const stationsByCity: Record<CityCode, MetroStation[]> = {
  spb: typedMetroData.spb,
  moscow: typedMetroData.moscow,
};

export class MetroService {
  static getAllStations(city: CityCode): MetroStation[] {
    return stationsByCity[city];
  }

  static getStationByName(name: string, city: CityCode): MetroStation | undefined {
    const lower = name.toLowerCase();
    return stationsByCity[city].find(
      station => station.name.toLowerCase() === lower || station.nameEn.toLowerCase() === lower
    );
  }

  static searchStations(query: string, city: CityCode): MetroStation[] {
    const trimmed = query.trim();
    if (!trimmed) return stationsByCity[city];
    const lower = trimmed.toLowerCase();
    return stationsByCity[city].filter(
      station =>
        station.name.toLowerCase().includes(lower) || station.nameEn.toLowerCase().includes(lower)
    );
  }

  static getStationsByLine(lineName: string, city: CityCode): MetroStation[] {
    return stationsByCity[city].filter(
      station => station.line === lineName || station.lineEn === lineName
    );
  }

  static getUniqueLines(city: CityCode): MetroLine[] {
    const linesMap = new Map<string, MetroLine>();
    for (const station of stationsByCity[city]) {
      if (!linesMap.has(station.line)) {
        linesMap.set(station.line, {
          name: station.line,
          nameEn: station.lineEn,
          color: station.lineColor,
        });
      }
    }
    return Array.from(linesMap.values());
  }

  static getStationsByDistance(
    userLat: number,
    userLon: number,
    city: CityCode,
    maxResults: number = 10
  ): Array<MetroStation & { distance: number }> {
    return stationsByCity[city]
      .filter(
        (
          station
        ): station is MetroStation & { coordinates: NonNullable<MetroStation['coordinates']> } =>
          station.coordinates !== undefined
      )
      .map(station => ({
        ...station,
        distance: this.calculateDistance(
          userLat,
          userLon,
          station.coordinates.latitude,
          station.coordinates.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  }
}
