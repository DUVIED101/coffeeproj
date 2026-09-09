import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '@bystrobarista/core/config/constants';
import { ReportService } from '@bystrobarista/core/services/ReportService';
import type { ReportOutcome, UserReport } from '@bystrobarista/core/types/userReport';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'MyReports'>;
};

const OUTCOME_COLOR: Record<ReportOutcome, string> = {
  no_violation: '#6B7280',
  warning: '#F59E0B',
  suspension: '#10B981',
  ban: '#10B981',
};

const ReportItem = React.memo(({ report }: { report: UserReport }) => {
  const { t, i18n } = useTranslation();
  const closed = report.status === 'resolved' || report.status === 'dismissed';
  const badgeColor = closed && report.outcome ? OUTCOME_COLOR[report.outcome] : '#F59E0B';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>
            {t(`report.reason.${report.reasonCode}`)}{' '}
            <Text style={styles.cardTarget}>{t(`myReports.target.${report.targetType}`)}</Text>
          </Text>
          <Text style={styles.cardDate}>
            {new Date(report.createdAt).toLocaleDateString(
              i18n.language === 'ru' ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'long', year: 'numeric' }
            )}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {closed && report.outcome
              ? t(`myReports.outcome.${report.outcome}`)
              : t('myReports.pending')}
          </Text>
        </View>
      </View>
      {report.details ? <Text style={styles.details}>{report.details}</Text> : null}
      {report.resolutionNote ? (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>{t('myReports.reply')}</Text>
          <Text style={styles.replyText}>{report.resolutionNote}</Text>
        </View>
      ) : null}
    </View>
  );
});
ReportItem.displayName = 'ReportItem';

export const MyReportsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('myReports.title') });
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const rows = await ReportService.listMyReports();
          if (!cancelled) setReports(rows);
        } catch (error) {
          console.error('MyReportsScreen: load failed', error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      void load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const renderItem = useCallback(
    ({ item }: { item: UserReport }) => <ReportItem report={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('myReports.empty')}</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  loader: { marginTop: 32 },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48, fontSize: 14 },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cardTarget: { fontWeight: '400', color: COLORS.textSecondary },
  cardDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  details: { marginTop: 8, fontSize: 14, color: COLORS.textSecondary },
  reply: {
    marginTop: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  replyText: { fontSize: 14, color: COLORS.text, marginTop: 2 },
});
