import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import type { MyDisputeItem, DisputeStatus } from '../../types/application';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'MyDisputes'>;
};

const STATUS_COLOR: Record<DisputeStatus, string> = {
  submitted: '#F59E0B',
  under_review: '#3B82F6',
  resolved: '#10B981',
  dismissed: '#6B7280',
};

type Section = { title: string; data: MyDisputeItem[] };

export const MyDisputesScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('disputes.myDisputesTitle'),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.getParent()?.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Назад' })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          const [filed, against] = await Promise.all([
            ApplicationService.getMyFiledDisputes(),
            ApplicationService.getDisputesAgainstMe(),
          ]);
          if (!cancelled) {
            const next: Section[] = [];
            if (against.length > 0) {
              next.push({
                title: t('disputes.sectionAgainstMe', { defaultValue: 'Поданные на меня' }),
                data: against,
              });
            }
            if (filed.length > 0) {
              next.push({
                title: t('disputes.sectionFiledByMe', { defaultValue: 'Поданные мной' }),
                data: filed,
              });
            }
            setSections(next);
          }
        } catch {
          // non-critical
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [t])
  );

  const renderItem = useCallback(
    ({ item }: { item: MyDisputeItem }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DisputeDetails', { disputeId: item.id })}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.jobTitle ?? t('disputes.unknownJob', { defaultValue: 'Вакансия' })}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] }]}>
            <Text style={styles.statusText}>{t(`disputes.status.${item.status}`)}</Text>
          </View>
        </View>
        {item.businessName ? (
          <Text style={styles.businessName} numberOfLines={1}>
            {item.businessName}
          </Text>
        ) : null}
        <Text style={styles.categories}>
          {item.categories.map(c => t(`disputes.category.${c}`)).join(', ')}
        </Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </TouchableOpacity>
    ),
    [navigation, t]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
    ),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (sections.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('disputes.myDisputesEmpty', { defaultValue: 'Вы ещё не подавали жалоб' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBack: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBackText: { fontSize: 28, color: COLORS.primary, lineHeight: 30 },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  jobTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  businessName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  categories: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  date: { fontSize: 12, color: COLORS.textSecondary },
});
