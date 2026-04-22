import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { NotificationPreferencesService } from '../../services/NotificationPreferencesService';
import type { UserId } from '../../types/ids';
import type { UpdateNotificationPreferences } from '../../types/notificationPreferences';

type PrefKey = keyof UpdateNotificationPreferences;

type PrefsState = {
  newMessage: boolean;
  applicationAccepted: boolean;
  applicationRejected: boolean;
};

const DEFAULT_PREFS: PrefsState = {
  newMessage: true,
  applicationAccepted: true,
  applicationRejected: true,
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id);

  const [prefs, setPrefs] = useState<PrefsState>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.notifications.title') });
  }, [navigation, t]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      try {
        const loaded = await NotificationPreferencesService.getPreferences(userId as UserId);
        if (cancelled) return;
        if (loaded) {
          setPrefs({
            newMessage: loaded.newMessage,
            applicationAccepted: loaded.applicationAccepted,
            applicationRejected: loaded.applicationRejected,
          });
        }
      } catch (err) {
        console.error('Error in NotificationsScreen.load:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleToggle = async (key: PrefKey, value: boolean) => {
    if (!userId) return;
    const previous = prefs[key];
    setPrefs(s => ({ ...s, [key]: value }));
    try {
      await NotificationPreferencesService.upsertPreferences(userId as UserId, { [key]: value });
    } catch (err) {
      console.error('Error in upsertPreferences:', err);
      setPrefs(s => ({ ...s, [key]: previous }));
      Alert.alert(t('common.error'), t('common.retry'));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator style={styles.loading} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('settings.notifications.deliveryPending')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.notifications.newMessage')}</Text>
            <Switch value={prefs.newMessage} onValueChange={v => handleToggle('newMessage', v)} />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.notifications.applicationAccepted')}</Text>
            <Switch
              value={prefs.applicationAccepted}
              onValueChange={v => handleToggle('applicationAccepted', v)}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.notifications.applicationRejected')}</Text>
            <Switch
              value={prefs.applicationRejected}
              onValueChange={v => handleToggle('applicationRejected', v)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loading: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  banner: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
});
