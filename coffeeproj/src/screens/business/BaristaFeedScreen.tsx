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
import { useAuthStore } from '../../stores/authStore';
import { BaristaCard } from '../../components/BaristaCard';
import { BaristaFilterBar } from '../../components/BaristaFilterBar';
import type { BaristaProfile, BaristaFilters } from '../../types/baristaProfile';
import type { BusinessSearchStackParamList } from '../../navigation/BusinessSearchStack';

type Props = {
  navigation: NativeStackNavigationProp<BusinessSearchStackParamList, 'BaristaFeed'>;
};

const BaristaCardItem = React.memo<{
  profile: BaristaProfile;
  onPressUserId: (userId: string) => void;
}>(({ profile, onPressUserId }) => (
  <BaristaCard profile={profile} onPress={() => onPressUserId(profile.userId)} />
));

export const BaristaFeedScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [baristas, setBaristas] = useState<BaristaProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<BaristaFilters>({});
  const [branchMetroStations, setBranchMetroStations] = useState<string[]>([]);

  useEffect(() => {
    loadBranchMetroStations();
  }, [user?.id]);

  useEffect(() => {
    loadBaristas();
  }, [filters]);

  const loadBranchMetroStations = async () => {
    if (!user?.id) return;

    try {
      const business = await BusinessService.getBusinessByOwnerId(user.id);
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
      <BaristaCardItem profile={item} onPressUserId={handleBaristaPress} />
    ),
    [handleBaristaPress]
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
