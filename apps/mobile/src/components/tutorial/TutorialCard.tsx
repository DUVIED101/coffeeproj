import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { COLORS, RADII } from '@bystrobarista/core/config/constants';

type Props = {
  title: string;
  body?: string;
  stepLabel?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  maxBodyHeight?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export const TutorialCard: React.FC<Props> = ({
  title,
  body,
  stepLabel,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  maxBodyHeight,
  style,
  onLayout,
}) => (
  <View style={[styles.card, style]} onLayout={onLayout} accessibilityViewIsModal>
    {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
    {body ? (
      <ScrollView
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    ) : null}
    {(primaryLabel || secondaryLabel) && (
      <View style={styles.actions}>
        {secondaryLabel && onSecondary ? (
          <TouchableOpacity
            onPress={onSecondary}
            style={styles.secondaryButton}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {primaryLabel && onPrimary ? (
          <TouchableOpacity
            onPress={onPrimary}
            style={styles.primaryButton}
            accessibilityRole="button"
            activeOpacity={0.8}>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    )}
    {tertiaryLabel && onTertiary ? (
      <TouchableOpacity
        onPress={onTertiary}
        style={styles.tertiaryButton}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.tertiaryText}>{tertiaryLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.input,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  tertiaryButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
  },
  tertiaryText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
