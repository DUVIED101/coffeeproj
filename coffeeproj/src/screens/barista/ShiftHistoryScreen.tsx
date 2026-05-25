import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService, type CompletedShiftEntry } from '../../services/ApplicationService';
import { useAuthStore } from '../../stores/authStore';
import { StarRow } from '../../components/StarRow';
import { ReviewModal } from '../../components/ReviewModal';
import type { ApplicationId, UserId } from '../../types/ids';

type ShiftHistoryStackParamList = {
  ShiftHistory: undefined;
  ApplicationDetails: { application: CompletedShiftEntry };
};

type Props = {
  navigation: NativeStackNavigationProp<ShiftHistoryStackParamList, 'ShiftHistory'>;
};

const formatRange = (startIso: string, endIso: string | undefined, locale: string): string => {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  if (!endIso || endIso === startIso) return fmt(startIso);
  return `${fmt(startIso)} → ${fmt(endIso)}`;
};

const ShiftHistoryCard = React.memo<{
  entry: CompletedShiftEntry;
  onPress: (entry: CompletedShiftEntry) => void;
  onRateBusiness: (entry: CompletedShiftEntry) => void;
}>(({ entry, onPress, onRateBusiness }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const handlePress = useCallback(() => onPress(entry), [onPress, entry]);
  const handleRate = useCallback(() => onRateBusiness(entry), [onRateBusiness, entry]);

  const businessName = entry.job?.businessName ?? '';
  const branchName = entry.job?.branchName;
  const metro = entry.job?.metroStation;
  const range = entry.job?.shiftDetails
    ? formatRange(entry.job.shiftDetails.startDate, entry.job.shiftDetails.endDate, locale)
    : '';

  const canRate = !entry.baristaReview && Boolean(entry.job?.businessOwnerId);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.headerRow}>
        <Text style={styles.businessName} numberOfLines={1}>
          {businessName}
        </Text>
        <Text style={styles.hours}>{t('shiftHistory.hours', { hours: entry.hoursWorked })}</Text>
      </View>

      {(branchName || metro) && (
        <Text style={styles.subtitle}>
          {branchName}
          {branchName && metro ? ' · ' : ''}
          {metro}
        </Text>
      )}

      <Text style={styles.range}>{range}</Text>

      <View style={styles.reviewRow}>
        {entry.businessReview ? (
          <StarRow rating={entry.businessReview.rating} size={16} />
        ) : (
          <Text style={styles.noReview}>{t('shiftHistory.noReviewLeft')}</Text>
        )}
      </View>

      {entry.baristaReview ? (
        <View style={styles.ownReviewRow}>
          <Text style={styles.ownReviewLabel}>
            {t('shiftHistory.yourReview', { defaultValue: 'Ваш отзыв:' })}
          </Text>
          <StarRow rating={entry.baristaReview.rating} size={14} />
        </View>
      ) : canRate ? (
        <TouchableOpacity style={styles.rateButton} onPress={handleRate} activeOpacity={0.7}>
          <Text style={styles.rateButtonText}>
            {t('shiftHistory.rateBusiness', { defaultValue: 'Оценить бизнес' })}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
});

export const ShiftHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id) as UserId | undefined;
  const [entries, setEntries] = useState<CompletedShiftEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: ApplicationId;
    rateeId: UserId;
  } | null>(null);

  const loadEntries = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await ApplicationService.getCompletedApplicationsByBarista(userId);
      setEntries(data);
    } catch (error) {
      console.error('Error loading shift history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEntries();
  }, [loadEntries]);

  const handleEntryPress = useCallback(
    (entry: CompletedShiftEntry) => {
      navigation.navigate('ApplicationDetails', { application: entry });
    },
    [navigation]
  );

  const handleRateBusiness = useCallback((entry: CompletedShiftEntry) => {
    const ownerId = entry.job?.businessOwnerId;
    if (!ownerId) return;
    setReviewTarget({
      applicationId: entry.id as ApplicationId,
      rateeId: ownerId as UserId,
    });
  }, []);

  const renderEntry = useCallback(
    ({ item }: { item: CompletedShiftEntry }) => (
      <ShiftHistoryCard
        entry={item}
        onPress={handleEntryPress}
        onRateBusiness={handleRateBusiness}
      />
    ),
    [handleEntryPress, handleRateBusiness]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('shiftHistory.empty')}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {reviewTarget && (
        <ReviewModal
          visible
          applicationId={reviewTarget.applicationId}
          raterRole="barista"
          rateeId={reviewTarget.rateeId}
          onSubmitted={() => {
            setReviewTarget(null);
            loadEntries();
          }}
          onSkip={() => setReviewTarget(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  hours: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  range: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noReview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  ownReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ownReviewLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rateButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
