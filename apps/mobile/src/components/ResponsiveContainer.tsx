import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export const ResponsiveContainer: React.FC<Props> = ({ children, maxWidth = 680, style }) => {
  const { isTablet } = useResponsiveLayout();
  if (!isTablet) {
    return <View style={[styles.flex, style]}>{children}</View>;
  }
  return (
    <View style={[styles.flex, styles.center, style]}>
      <View style={[styles.flex, { width: '100%', maxWidth }]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
});
