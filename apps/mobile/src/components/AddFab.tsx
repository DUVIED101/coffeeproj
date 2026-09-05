import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import { TutorialAnchor } from './tutorial/TutorialAnchor';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  iconName?: 'plus' | 'close';
  tutorialKey?: TutorialAnchorKey;
};

const ICON_SIZE = 32;

export const AddFab: React.FC<Props> = ({
  onPress,
  accessibilityLabel,
  iconName = 'plus',
  tutorialKey,
}) => (
  <TouchableOpacity
    style={styles.fab}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    activeOpacity={0.7}>
    {tutorialKey && (
      <TutorialAnchor
        tutorialKey={tutorialKey}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    )}
    <View style={styles.iconWrapper}>
      <MaterialCommunityIcons name={iconName} size={ICON_SIZE} color={COLORS.background} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
