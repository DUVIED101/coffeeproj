import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import type { DisputeSummary, DisputeStatus } from '../../types/application';
import type { ApplicationId } from '../../types/ids';

type ParamList = {
  DisputeDetails: { applicationId: string };
};

type Props = NativeStackScreenProps<ParamList, 'DisputeDetails'>;

const STATUS_COLOR: Record<DisputeStatus, string> = {
  submitted: '#F59E0B',
  under_review: '#3B82F6',
  resolved: '#10B981',
  dismissed: '#6B7280',
};

const SEVERITY_COLOR: Record<string, string> = {
  warning: '#F59E0B',
  serious: '#FF8C00',
  critical: '#EF4444',
};

export const DisputeDetailsScreen: React.FC<Props> = ({ route }) => {
  const { applicationId } = route.params;
  const { t } = useTranslation();
  const [dispute, setDispute] = useState<DisputeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await ApplicationService.getOwnDispute(applicationId as ApplicationId);
        if (!cancelled) {
          if (data) setDispute(data);
          else setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !dispute) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Text style={styles.notFound}>
          {t('disputes.notFound', { defaultValue: 'Жалоба не найдена' })}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[dispute.status] }]}>
            <Text style={styles.statusText}>{t(`disputes.status.${dispute.status}`)}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(dispute.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('disputes.categoryLabel')}</Text>
          <View style={styles.chipRow}>
            {dispute.categories.map(c => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{t(`disputes.category.${c}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('disputes.severityLabel')}</Text>
          <View
            style={[
              styles.chip,
              { borderColor: SEVERITY_COLOR[dispute.severity] ?? COLORS.border },
            ]}>
            <Text style={styles.chipText}>{t(`disputes.severity.${dispute.severity}`)}</Text>
          </View>
        </View>

        {dispute.resolutionNote ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t('disputes.resolutionNote')}</Text>
            <Text style={styles.bodyText}>{dispute.resolutionNote}</Text>
          </View>
        ) : null}

        {dispute.status === 'submitted' || dispute.status === 'under_review' ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {t('disputes.pendingNote', {
                defaultValue: 'Жалоба передана модераторам и будет рассмотрена в ближайшее время.',
              })}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center' },
  notFound: { flex: 1, textAlign: 'center', marginTop: 48, color: COLORS.textSecondary },
  content: { padding: 20, gap: 0 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  date: { fontSize: 13, color: COLORS.textSecondary },
  section: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, color: COLORS.text },
  bodyText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  infoText: { fontSize: 14, color: '#1D4ED8', lineHeight: 20 },
});
