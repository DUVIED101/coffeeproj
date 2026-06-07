import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
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

type Props = {
  children: React.ReactNode;
};

/**
 * Wraps the app: when users.suspended_until > now(), renders a top banner that
 * consumes the device's top safe-area, then overrides SafeAreaInsetsContext for
 * children so screen headers below don't double-pad. Re-checks every minute so
 * it clears itself when the suspension expires.
 */
export const SuspendedUserBanner: React.FC<Props> = memo(({ children }) => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const adjustedInsets = useMemo(() => ({ ...insets, top: 0 }), [insets]);

  const isSuspended =
    !!user &&
    !!user.suspendedUntil &&
    !user.bannedAt &&
    !Number.isNaN(new Date(user.suspendedUntil).getTime()) &&
    new Date(user.suspendedUntil).getTime() > now;

  if (!isSuspended) return <>{children}</>;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.text} numberOfLines={1}>
          {t('account.suspendedBanner', {
            date: formatSuspendedUntil(user!.suspendedUntil!, i18n.language),
          })}
        </Text>
      </View>
      <SafeAreaInsetsContext.Provider value={adjustedInsets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </>
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
