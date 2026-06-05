import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  AccessibilityInfo,
} from 'react-native';
import { COLORS } from '../config/constants';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton: React.FC<Props> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.6)).current;
  const reducedMotion = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (cancelled) return;
      reducedMotion.current = enabled;
      if (enabled) {
        opacity.setValue(0.7);
        return;
      }
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      opacity.stopAnimation();
    };
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius, opacity }, style]}
    />
  );
};

export const SkeletonRow: React.FC<{ count?: number; gap?: number }> = ({ count = 3, gap = 8 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ marginTop: i === 0 ? 0 : gap }}>
        <Skeleton />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.backgroundSecondary,
    overflow: 'hidden',
  },
});
