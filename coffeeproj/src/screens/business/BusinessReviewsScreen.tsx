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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { StarRow } from '../../components/StarRow';
import { ReviewListRow } from '../../components/ReviewListRow';
import type { ApplicationReview, UserReviewAggregate } from '../../types/review';
import type { UserId } from '../../types/ids';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'BusinessReviews'>;
};

export const BusinessReviewsScreen: React.FC<Props> = () => {
  const { t } = useTranslation();
  const ownerUserId = useAuthStore(s => s.user?.id) as UserId | undefined;
  const [aggregate, setAggregate] = useState<UserReviewAggregate | null>(null);
  const [reviews, setReviews] = useState<ApplicationReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!ownerUserId) {
      setIsLoading(false);
      return;
    }
    try {
      const [aggData, listData] = await Promise.all([
        ReviewService.getAggregateForUser(ownerUserId),
        ReviewService.getReviewsForUser(ownerUserId),
      ]);
      setAggregate(aggData);
      setReviews(listData);
    } catch (error) {
      console.error('Error loading business reviews:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ownerUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
  }, [load]);

  const renderRow = useCallback(
    ({ item }: { item: ApplicationReview }) => <ReviewListRow review={item} />,
    []
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
      <View style={styles.headerCard}>
        {aggregate && aggregate.reviewCount > 0 ? (
          <StarRow
            rating={aggregate.averageRating}
            count={aggregate.reviewCount}
            showValue
            size={22}
          />
        ) : (
          <Text style={styles.emptyHeader}>{t('reviews.noRatingsShort')}</Text>
        )}
      </View>

      <FlatList
        data={reviews}
        renderItem={renderRow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>{t('reviews.empty')}</Text>}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
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
  headerCard: {
    padding: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  emptyHeader: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 60,
  },
});
