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
  TouchableOpacity,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { useAuthStore } from '../../stores/authStore';
import { FilterBar } from '../../components/FilterBar';
import { JobCard } from '../../components/JobCard';
import { requestLocationPermission, getCurrentLocation } from '../../utils/geolocation';
import type { Job, JobFilters } from '../../types/job';
import type { GeoPoint } from '../../types/business';
import type { BaristaProfile } from '../../types/baristaProfile';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string };
  BaristaProfileSetup: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobFeed'>;
};

const formatDistance = (distanceMeters?: number): string => {
  if (!distanceMeters) return '';
  const km = (distanceMeters / 1000).toFixed(1);
  return `${km} км от вас`;
};

const JobCardWithDistance = React.memo<{ job: Job; onPress: () => void }>(({ job, onPress }) => {
  return (
    <View>
      <JobCard job={job} onPress={onPress} />
      {job.distance !== undefined && (
        <Text style={styles.distanceText}>{formatDistance(job.distance)}</Text>
      )}
    </View>
  );
});

export const JobFeedScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(undefined);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({});
  const [baristaProfile, setBaristaProfile] = useState<BaristaProfile | null>(null);
  const [showProfileBanner, setShowProfileBanner] = useState(false);

  useEffect(() => {
    initializeLocation();
    loadBaristaProfile();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [filters, userLocation]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();

      if (hasPermission) {
        const location = await getCurrentLocation();
        if (location) {
          setUserLocation(location);
          setLocationPermissionDenied(false);
        } else {
          setLocationPermissionDenied(true);
        }
      } else {
        setLocationPermissionDenied(true);
        Alert.alert(
          'Доступ к геолокации',
          'Для поиска работы рядом с вами необходим доступ к вашему местоположению. Вы можете использовать фильтры по метро.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      setLocationPermissionDenied(true);
    }
  };

  const loadBaristaProfile = async () => {
    if (!user?.id) return;

    try {
      const profile = await BaristaProfileService.getProfileByUserId(user.id);
      setBaristaProfile(profile);

      if (!profile || profile.profileCompleteness < 50) {
        setShowProfileBanner(true);
      }
    } catch (error) {
      console.error('Error loading barista profile:', error);
    }
  };

  const loadJobs = async () => {
    try {
      console.log('🔍 Loading jobs with filters:', filters);
      console.log('📍 User location:', userLocation);
      const jobsData = await JobService.searchJobs(filters, userLocation);
      console.log('✅ Jobs loaded:', jobsData.length);
      console.log('📋 Jobs data:', JSON.stringify(jobsData, null, 2));
      setJobs(jobsData);
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить вакансии. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadJobs();
  };

  const handleFilterChange = useCallback((newFilters: JobFilters) => {
    setFilters(newFilters);
  }, []);

  const handleJobPress = useCallback(
    (jobId: string) => {
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation]
  );

  const renderJob = useCallback(
    ({ item }: { item: Job }) => (
      <JobCardWithDistance job={item} onPress={() => handleJobPress(item.id)} />
    ),
    [handleJobPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Нет доступных вакансий</Text>
      <Text style={styles.emptySubtext}>
        {locationPermissionDenied
          ? 'Попробуйте использовать фильтры по метро или типу работы'
          : 'Попробуйте изменить фильтры поиска'}
      </Text>
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
        <Text style={styles.title}>Поиск работы</Text>
      </View>

      {showProfileBanner && (
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => navigation.navigate('BaristaProfileSetup')}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Complete Your Profile</Text>
            <Text style={styles.bannerSubtitle}>
              {!baristaProfile
                ? 'Create your profile to stand out to employers'
                : `Your profile is ${baristaProfile.profileCompleteness}% complete`}
            </Text>
          </View>
          <Text style={styles.bannerArrow}>›</Text>
        </TouchableOpacity>
      )}

      <FilterBar
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        userLocation={userLocation}
      />

      <FlatList
        data={jobs}
        renderItem={renderJob}
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
  distanceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 16,
  },
  profileBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#92400E',
  },
  bannerArrow: {
    fontSize: 24,
    fontWeight: '600',
    color: '#92400E',
  },
});
