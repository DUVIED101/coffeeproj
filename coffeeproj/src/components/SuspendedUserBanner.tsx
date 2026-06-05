import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { useAuthStore } from '../stores/authStore';

function formatSuspendedUntil(value: string, locale: string): string {
  try {
    return new Date(value).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

/**
 * Top-of-app banner shown while users.suspended_until > now(). Bans are handled
 * by BannedUserBlocker (full-screen modal). Re-checks every minute to clear
 * itself when the suspension expires without requiring a refetch.
 */
export const SuspendedUserBanner: React.FC = memo(() => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!user || !user.suspendedUntil || user.bannedAt) return null;

  const untilMs = new Date(user.suspendedUntil).getTime();
  if (Number.isNaN(untilMs) || untilMs <= now) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.text} numberOfLines={1}>
        {t('account.suspendedBanner', {
          date: formatSuspendedUntil(user.suspendedUntil, i18n.language),
        })}
      </Text>
    </View>
  );
});

SuspendedUserBanner.displayName = 'SuspendedUserBanner';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
