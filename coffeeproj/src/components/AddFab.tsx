import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../config/constants';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  iconName?: 'plus' | 'close';
};

const ICON_SIZE = 28;

export const AddFab: React.FC<Props> = ({ onPress, accessibilityLabel, iconName = 'plus' }) => (
  <TouchableOpacity
    style={styles.fab}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    activeOpacity={0.7}>
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
