import metroData from '../data/metro-stations.json';

export interface MetroStation {
  id: string;
  name: string;
  nameEn: string;
  line: string;
  lineEn: string;
  lineColor: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface MetroStationsData {
  stpetersburg: MetroStation[];
}

const typedMetroData = metroData as MetroStationsData;

export class MetroService {
  private static stations: MetroStation[] = typedMetroData.stpetersburg;

  /**
   * Get all metro stations
   */
  static getAllStations(): MetroStation[] {
    return this.stations;
  }

  /**
   * Get station by name
   */
  static getStationByName(name: string): MetroStation | undefined {
    return this.stations.find(
      station =>
        station.name.toLowerCase() === name.toLowerCase() ||
        station.nameEn.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Search stations by partial name
   */
  static searchStations(query: string): MetroStation[] {
    const lowerQuery = query.toLowerCase();
    return this.stations.filter(
      station =>
        station.name.toLowerCase().includes(lowerQuery) ||
        station.nameEn.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get stations by line
   */
  static getStationsByLine(lineName: string): MetroStation[] {
    return this.stations.filter(
      station => station.line === lineName || station.lineEn === lineName
    );
  }

  /**
   * Get unique lines
   */
  static getUniqueLines(): Array<{ name: string; nameEn: string; color: string }> {
    const linesMap = new Map<string, { name: string; nameEn: string; color: string }>();

    this.stations.forEach(station => {
      if (!linesMap.has(station.line)) {
        linesMap.set(station.line, {
          name: station.line,
          nameEn: station.lineEn,
          color: station.lineColor,
        });
      }
    });

    return Array.from(linesMap.values());
  }

  /**
   * Get stations sorted by distance from user location
   */
  static getStationsByDistance(
    userLat: number,
    userLon: number,
    maxResults: number = 10
  ): Array<MetroStation & { distance: number }> {
    const stationsWithDistance = this.stations.map(station => ({
      ...station,
      distance: this.calculateDistance(
        userLat,
        userLon,
        station.coordinates.latitude,
        station.coordinates.longitude
      ),
    }));

    return stationsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, maxResults);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
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

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  }
}
