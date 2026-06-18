import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { BusinessService } from '../../services/BusinessService';
import { showErrorToast } from '../../stores/errorToastStore';

export const VisibilityScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.visibility.title') });
  }, [navigation, t]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        if (user.accountType === 'barista') {
          const profile = await BaristaProfileService.getProfileByUserId(user.id);
          if (!cancelled) setEnabled(profile?.isActivelyLooking ?? true);
        } else {
          const business = await BusinessService.getBusinessByOwnerId(user.id);
          if (!cancelled) {
            setBusinessId(business?.id ?? null);
            setEnabled(business?.isAcceptingApplications ?? true);
          }
        }
      } catch (err) {
        console.error('Error in VisibilityScreen.load:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggle = async (value: boolean) => {
    if (!user || enabled === null) return;
    const previous = enabled;
    setEnabled(value);
    try {
      if (user.accountType === 'barista') {
        await BaristaProfileService.updateProfile(user.id, { isActivelyLooking: value });
      } else {
        if (!businessId) throw new Error('No business found');
        await BusinessService.updateBusiness(businessId, { isAcceptingApplications: value });
      }
    } catch (err) {
      console.error('Error in VisibilityScreen.handleToggle:', err);
      setEnabled(previous);
      showErrorToast(t('common.retry'));
    }
  };

  if (isLoading || enabled === null) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ActivityIndicator style={styles.loading} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const isBarista = user?.accountType === 'barista';
  const toggleLabel = isBarista
    ? t('settings.visibility.baristaToggle')
    : t('settings.visibility.businessToggle');
  const hint = isBarista
    ? t('settings.visibility.baristaHint')
    : t('settings.visibility.businessHint');

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{toggleLabel}</Text>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loading: { flex: 1 },
  scrollContent: {
    paddingVertical: 16,
  },
  card: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 12,
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
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 24,
    marginTop: 10,
    lineHeight: 18,
  },
});
