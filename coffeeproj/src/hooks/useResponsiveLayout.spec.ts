import { describe, it, expect, jest } from '@jest/globals';

let mockDimensions = { width: 0, height: 0 };

jest.mock('react-native', () => ({
  useWindowDimensions: () => mockDimensions,
}));

import { useResponsiveLayout } from './useResponsiveLayout';

const setWindow = (width: number, height: number): void => {
  mockDimensions = { width, height };
};

describe('useResponsiveLayout', () => {
  it('reports phone layout for iPhone 14 portrait', () => {
    setWindow(390, 844);
    expect(useResponsiveLayout()).toEqual({
      width: 390,
      height: 844,
      isLandscape: false,
      layout: 'phone',
      isTablet: false,
    });
  });

  it('reports tablet layout for iPad Mini portrait', () => {
    setWindow(768, 1024);
    expect(useResponsiveLayout()).toEqual({
      width: 768,
      height: 1024,
      isLandscape: false,
      layout: 'tablet',
      isTablet: true,
    });
  });

  it('reports wide layout for iPad Pro landscape', () => {
    setWindow(1366, 1024);
    expect(useResponsiveLayout()).toEqual({
      width: 1366,
      height: 1024,
      isLandscape: true,
      layout: 'wide',
      isTablet: true,
    });
  });

  it('treats iPad in 1/3 Split View (compact width) as phone', () => {
    setWindow(375, 1024);
    expect(useResponsiveLayout()).toEqual({
      width: 375,
      height: 1024,
      isLandscape: false,
      layout: 'phone',
      isTablet: false,
    });
  });
});
