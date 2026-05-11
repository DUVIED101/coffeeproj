import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { BaristaSearchService } from '../../services/BaristaSearchService';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { BaristaCard } from '../../components/BaristaCard';
import { BaristaFilterBar } from '../../components/BaristaFilterBar';
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
  const userId = useAuthStore(s => s.user?.id);
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
      Alert.alert('Ошибка', 'Не удалось загрузить баристов');
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
      <Text style={styles.emptyText}>Нет баристов по фильтрам</Text>
      <Text style={styles.emptySubtext}>Попробуйте изменить фильтры поиска</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>Поиск баристы</Text>
      </View>

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
