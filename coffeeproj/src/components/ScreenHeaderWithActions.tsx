import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../config/constants';

export type HeaderAction = {
  label: string;
  onPress: () => void;
};

type ScreenHeaderWithActionsProps = {
  title: string;
  actions?: HeaderAction[];
  onBack?: () => void;
};

export const ScreenHeaderWithActions = React.memo<ScreenHeaderWithActionsProps>(
  ({ title, actions, onBack }) => {
    const insets = useSafeAreaInsets();

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {actions && actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.pillButton}
                  onPress={action.onPress}
                  activeOpacity={0.7}>
                  <Text style={styles.pillButtonText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 28,
    color: COLORS.primary,
    fontWeight: '400',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
