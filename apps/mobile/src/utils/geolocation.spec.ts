jest.mock('react-native-geolocation-service', () => ({}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { calculateDistance } from './geolocation';
import type { GeoPoint } from '../types';

describe('calculateDistance', () => {
  it('returns zero meters when both points are identical', () => {
    const moscowCenter: GeoPoint = { latitude: 55.7558, longitude: 37.6173 };
    const distance = calculateDistance(moscowCenter, moscowCenter);
    expect(distance).toBe(0);
  });

  it('calculates distance from Moscow center to Saint Petersburg center as approximately 634km', () => {
    const moscowCenter: GeoPoint = { latitude: 55.7558, longitude: 37.6173 };
    const stPetersburgCenter: GeoPoint = {
      latitude: 59.9343,
      longitude: 30.3351,
    };

    const distance = calculateDistance(moscowCenter, stPetersburgCenter);
    const expectedDistanceMeters = 634000;
    const toleranceMeters = 5000;

    expect(distance).toBeGreaterThanOrEqual(expectedDistanceMeters - toleranceMeters);
    expect(distance).toBeLessThanOrEqual(expectedDistanceMeters + toleranceMeters);
  });

  it('calculates distance from Red Square to Sheremetyevo Airport as approximately 27.5km', () => {
    const redSquare: GeoPoint = { latitude: 55.7539, longitude: 37.6208 };
    const sheremetyevo: GeoPoint = { latitude: 55.9726, longitude: 37.4146 };

    const distance = calculateDistance(redSquare, sheremetyevo);
    const expectedDistanceMeters = 27500;
    const toleranceMeters = 500;

    expect(distance).toBeGreaterThanOrEqual(expectedDistanceMeters - toleranceMeters);
    expect(distance).toBeLessThanOrEqual(expectedDistanceMeters + toleranceMeters);
  });

  it('calculates distance symmetrically regardless of point order', () => {
    const pointA: GeoPoint = { latitude: 55.7558, longitude: 37.6173 };
    const pointB: GeoPoint = { latitude: 59.9343, longitude: 30.3351 };

    const distanceAB = calculateDistance(pointA, pointB);
    const distanceBA = calculateDistance(pointB, pointA);

    expect(distanceAB).toBe(distanceBA);
  });

  it('calculates short distances accurately within same neighborhood', () => {
    const pointA: GeoPoint = { latitude: 55.7558, longitude: 37.6173 };
    const pointB: GeoPoint = { latitude: 55.7568, longitude: 37.6183 };

    const distance = calculateDistance(pointA, pointB);
    const expectedDistanceMeters = 130;
    const toleranceMeters = 20;

    expect(distance).toBeGreaterThanOrEqual(expectedDistanceMeters - toleranceMeters);
    expect(distance).toBeLessThanOrEqual(expectedDistanceMeters + toleranceMeters);
  });
});
