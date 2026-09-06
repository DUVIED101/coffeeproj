import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '@bystrobarista/core/config/constants';

type Props = {
  label: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export const TutorialChip: React.FC<Props> = ({
  label,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  style,
  onLayout,
}) => (
  <TouchableOpacity
    onPress={onPress}
    onLayout={onLayout}
    style={[styles.chip, style]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    activeOpacity={0.8}
    testID="tutorial.chip">
    <Text style={styles.text}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.text,
    borderRadius: 22,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
});
