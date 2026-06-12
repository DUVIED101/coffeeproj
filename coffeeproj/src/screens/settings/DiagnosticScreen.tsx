import React, { useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/constants';
import { ConnectivityReportPanel } from '../../components/ConnectivityReportPanel';
import { APP_VERSION } from '../../config/version';
import { SUPABASE_URL as ACTIVE_CLIENT_URL } from '../../config/supabase';
import {
  DIRECT_URL,
  PROXY_URL,
  getDeviceTimezone,
  isRussianTimezone,
  pickSupabaseHostSync,
} from '../../config/supabaseHost';

// Standalone diagnostic surface so the Phase 8.6 host-routing state is
// visible without first reaching ConnectionErrorScreen. Reachable from
// Settings → Диагностика and via a 1.5s long-press on the welcome title in
// AccountTypeScreen (so users stuck before login can still get here).
export const DiagnosticScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('diagnostic.title'),
      headerShown: true,
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.text,
      headerShadowVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.headerBackButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t]);

  const tz = useMemo(() => getDeviceTimezone() ?? 'unknown', []);
  const choice = useMemo(() => pickSupabaseHostSync(), []);
  const tzIsRu = isRussianTimezone(tz);

  const summary = useMemo(
    () =>
      [
        `app: ${APP_VERSION}`,
        `tz: ${tz}`,
        `tz-russian: ${tzIsRu ? 'yes' : 'no'}`,
        `proxy-configured: ${PROXY_URL ? 'yes' : 'no'}`,
        `direct-url: ${DIRECT_URL}`,
        `proxy-url: ${PROXY_URL ?? '(unset)'}`,
        // The URL the supabase client was actually created with at module
        // load — this is what real network calls hit, not a re-pick.
        `client-url: ${ACTIVE_CLIENT_URL}`,
        `picked-url: ${choice.url}`,
        `picked-reason: ${choice.reason}`,
      ].join('\n'),
    [tz, tzIsRu, choice]
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>{t('diagnostic.intro')}</Text>

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>{t('diagnostic.summaryLabel')}</Text>
          <TextInput
            style={styles.summaryText}
            value={summary}
            multiline
            editable={false}
            selectTextOnFocus
          />
        </View>

        <ConnectivityReportPanel />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  intro: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  summaryBlock: {
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 140,
    textAlignVertical: 'top',
    fontFamily: 'Menlo',
  },
  headerBackButton: {
    paddingHorizontal: 4,
  },
});
