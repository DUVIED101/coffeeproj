import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { BaristaSearchService } from '../../services/BaristaSearchService';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { BaristaCard } from '../../components/BaristaCard';
import { BaristaFilterBar } from '../../components/BaristaFilterBar';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import type { BaristaProfile, BaristaFilters } from '../../types/baristaProfile';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { BusinessSearchStackParamList } from '../../navigation/BusinessSearchStack';

type Props = {
  navigation: NativeStackNavigationProp<BusinessSearchStackParamList, 'BaristaFeed'>;
};

const BaristaCardItem = React.memo<{
  profile: BaristaProfile;
  onPressUserId: (userId: string) => void;
  reviewAggregate?: UserReviewAggregate;
}>(({ profile, onPressUserId, reviewAggregate }) => (
  <BaristaCard profile={profile} onPress={onPressUserId} reviewAggregate={reviewAggregate} />
));

export const BaristaFeedScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id);
  const unreadCount = useNotificationFeedStore(s => s.unreadCount);
  const [baristas, setBaristas] = useState<BaristaProfile[]>([]);
  const [aggregates, setAggregates] = useState<Map<UserId, UserReviewAggregate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<BaristaFilters>({});
  const [branchMetroStations, setBranchMetroStations] = useState<string[]>([]);

  useEffect(() => {
    loadBranchMetroStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadBaristas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadBranchMetroStations = async () => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return;

    try {
      const business = await BusinessService.getBusinessByOwnerId(currentUserId);
      if (!business) return;

      const branches = await BusinessService.getBranches(business.id);
      const stations = branches
        .map(b => b.metroStation)
        .filter((s): s is string => typeof s === 'string' && s.length > 0);
      setBranchMetroStations(Array.from(new Set(stations)));
    } catch (error) {
      console.error('Error loading branch metro stations:', error);
    }
  };

  const loadBaristas = async () => {
    try {
      const results = await BaristaSearchService.searchBaristas(filters);
      setBaristas(results);
      const userIds = results.map(p => p.userId as UserId);
      if (userIds.length > 0) {
        const aggMap = await ReviewService.getAggregatesForUsers(userIds);
        setAggregates(aggMap);
      } else {
        setAggregates(new Map());
      }
    } catch (error) {
      console.error('Error loading baristas:', error);
      Alert.alert(t('baristaFeed.loadFailedTitle'), t('baristaFeed.loadFailedBody'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBaristas();
  }, [filters]);

  const handleFilterChange = useCallback((newFilters: BaristaFilters) => {
    setFilters(newFilters);
  }, []);

  const handleBaristaPress = useCallback(
    (baristaUserId: string) => {
      navigation.navigate('ViewBaristaProfile', { baristaId: baristaUserId });
    },
    [navigation]
  );

  const renderBarista = useCallback(
    ({ item }: { item: BaristaProfile }) => (
      <BaristaCardItem
        profile={item}
        onPressUserId={handleBaristaPress}
        reviewAggregate={aggregates.get(item.userId as UserId)}
      />
    ),
    [handleBaristaPress, aggregates]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('baristaFeed.empty')}</Text>
      <Text style={styles.emptySubtext}>{t('baristaFeed.emptyHint')}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ResponsiveContainer maxWidth={720}>
          <View style={styles.listContent}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonRow}>
                  <Skeleton width={56} height={56} borderRadius={28} />
                  <View style={styles.skeletonRowText}>
                    <Skeleton width="65%" height={16} />
                    <Skeleton width="45%" height={13} style={styles.skeletonGap} />
                  </View>
                </View>
                <Skeleton width="80%" height={13} style={styles.skeletonGap} />
              </View>
            ))}
          </View>
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ResponsiveContainer maxWidth={720}>
        <ScreenHeaderWithActions
          title={t('baristaFeed.title')}
          actions={[
            {
              icon: 'bell-outline',
              badgeCount: unreadCount,
              onPress: () => navigation.navigate('NotificationFeed'),
              testID: 'bell',
            },
          ]}
        />

        <BaristaFilterBar
          onFilterChange={handleFilterChange}
          currentFilters={filters}
          branchMetroStations={branchMetroStations}
        />

        <FlatList
          data={baristas}
          renderItem={renderBarista}
          keyExtractor={item => item.id}
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
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonRowText: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
