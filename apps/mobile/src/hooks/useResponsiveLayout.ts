import { useWindowDimensions } from 'react-native';
import { classifyWidth, type LayoutClass } from '../utils/responsive';

export type ResponsiveLayout = {
  width: number;
  height: number;
  isLandscape: boolean;
  layout: LayoutClass;
  isTablet: boolean;
};

export const useResponsiveLayout = (): ResponsiveLayout => {
  const { width, height } = useWindowDimensions();
  const layout = classifyWidth(width);
  return {
    width,
    height,
    isLandscape: width > height,
    layout,
    isTablet: layout !== 'phone',
  };
};

export const useIsTablet = (): boolean => useResponsiveLayout().isTablet;
