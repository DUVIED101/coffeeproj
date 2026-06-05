import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '../config/constants';
import { Avatar } from './Avatar';

export type HeaderAction = {
  /** Text label — renders a pill button. Required when `icon` is not set. */
  label?: string;
  /** MaterialCommunityIcons name — renders an icon button instead of a pill. */
  icon?: string;
  /** VoiceOver label — required for icon-only actions (no visual text). */
  accessibilityLabel?: string;
  /** Number badge (e.g. unread count). Only rendered in icon mode. */
  badgeCount?: number;
  onPress: () => void;
  /** Stable key — required when an action has no label. */
  testID?: string;
};

type ScreenHeaderWithActionsProps = {
  title: string;
  actions?: HeaderAction[];
  onBack?: () => void;
  /** Optional avatar rendered between the back arrow and title. */
  avatarUri?: string | null;
  /** Fallback name used when avatarUri is missing. */
  avatarName?: string | null;
  /** When set, the avatar becomes tappable — used in chat to open the counterparty's profile. */
  onAvatarPress?: () => void;
};

const HEADER_AVATAR_SIZE = 32;

const formatBadge = (count: number): string => (count > 99 ? '99+' : String(count));

export const ScreenHeaderWithActions = React.memo<ScreenHeaderWithActionsProps>(
  ({ title, actions, onBack, avatarUri, avatarName, onAvatarPress }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const hasAvatar = avatarUri !== undefined || avatarName !== undefined;

    const avatarNode = hasAvatar ? (
      <Avatar size={HEADER_AVATAR_SIZE} uri={avatarUri} name={avatarName} />
    ) : null;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
          {avatarNode &&
            (onAvatarPress ? (
              <TouchableOpacity
                style={styles.avatarSlot}
                onPress={onAvatarPress}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 0, right: 4 }}>
                {avatarNode}
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarSlot}>{avatarNode}</View>
            ))}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {actions && actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action, index) => {
                const key = action.testID ?? action.label ?? action.icon ?? `action-${index}`;
                if (action.icon) {
                  const a11yLabel =
                    action.accessibilityLabel ??
                    (action.icon === 'bell-outline'
                      ? t('nav.notifications')
                      : (action.label ?? action.icon));
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.iconButton}
                      onPress={action.onPress}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        action.badgeCount && action.badgeCount > 0
                          ? `${a11yLabel}, ${action.badgeCount}`
                          : a11yLabel
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name={action.icon} size={24} color={COLORS.primary} />
                      {action.badgeCount !== undefined && action.badgeCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
                            {formatBadge(action.badgeCount)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.pillButton}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={action.accessibilityLabel ?? action.label}>
                    <Text style={styles.pillButtonText}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
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
  avatarSlot: {
    marginLeft: 14,
    marginRight: 10,
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
    borderRadius: RADII.pill,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
