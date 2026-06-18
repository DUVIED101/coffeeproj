import React, { useState, useEffect, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { ReviewService } from '../../services/ReviewService';
import { ApplicationService } from '../../services/ApplicationService';
import { useAuthStore } from '../../stores/authStore';
import { FilterBar } from '../../components/FilterBar';
import { JobCard } from '../../components/JobCard';
import { Skeleton } from '../../components/Skeleton';
import { useMasterDetail } from '../../components/MasterDetailContext';
import { showErrorToast } from '../../stores/errorToastStore';
import { mapAnyError } from '../../utils/errorHandler';
import {
  requestLocationPermission,
  getCurrentLocation,
  getLastKnownLocationFast,
} from '../../utils/geolocation';
import type { Job, JobFilters } from '../../types/job';
import type { GeoPoint } from '../../types/business';
import type { BaristaProfile } from '../../types/baristaProfile';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string };
  BaristaProfileSetup: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobFeed'>;
};

const JobCardWithDistance = React.memo<{
  job: Job;
  onPressJobId: (jobId: string) => void;
  ownerAggregate?: UserReviewAggregate;
  alreadyApplied?: boolean;
}>(({ job, onPressJobId, ownerAggregate, alreadyApplied }) => {
  const { t } = useTranslation();
  const hasDistance = job.distance != null;
  const distanceLabel = hasDistance
    ? t('jobFeed.distanceFromYou', {
        km: ((job.distance as number) / 1000).toFixed(1),
        defaultValue: '{{km}} км от вас',
      })
    : '';
  return (
    <View>
      <JobCard
        job={job}
        onPress={onPressJobId}
        ownerAggregate={ownerAggregate}
        alreadyApplied={alreadyApplied}
      />
      {hasDistance && <Text style={styles.distanceText}>{distanceLabel}</Text>}
    </View>
  );
});

export const JobFeedScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore(s => s.user);
  const { t } = useTranslation();
  const masterDetail = useMasterDetail();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(undefined);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({});
  const [baristaProfile, setBaristaProfile] = useState<BaristaProfile | null>(null);
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [ownerAggregates, setOwnerAggregates] = useState<Map<UserId, UserReviewAggregate>>(
    new Map()
  );
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const isFocused = useIsFocused();

  const loadBaristaProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const profile = await BaristaProfileService.getProfileByUserId(user.id);
      setBaristaProfile(profile);

      // Banner threshold matches the apply gate in JobDetailsScreen (20%).
      // Once a barista's profile is complete enough to apply, we stop nagging.
      setShowProfileBanner(!profile || profile.profileCompleteness < 20);
    } catch (error) {
      console.error('Error loading barista profile:', error);
    }
  }, [user?.id]);

  const loadAppliedJobs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const ids = await ApplicationService.getActiveAppliedJobIds(user.id);
      setAppliedJobIds(ids);
    } catch (error) {
      console.error('Error loading applied job ids:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    initializeLocation();
  }, []);

  // Reload profile whenever the tab regains focus (e.g. after the user
  // finishes BaristaProfileSetup in the Profile tab and switches back). The
  // previous useFocusEffect setup occasionally missed this trigger in the
  // tab → stack nesting; useIsFocused is observably reliable.
  useEffect(() => {
    if (!isFocused) return;
    loadBaristaProfile();
    loadAppliedJobs();
  }, [isFocused, loadBaristaProfile, loadAppliedJobs]);

  useEffect(() => {
    loadJobs();
  }, [filters, userLocation]);

  const initializeLocation = async () => {
    try {
      // Hydrate from cache first so distance renders immediately on relaunches.
      const cached = await getLastKnownLocationFast();
      if (cached) {
        setUserLocation(cached);
        setLocationPermissionDenied(false);
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        if (!cached) setLocationPermissionDenied(true);
        return;
      }

      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setLocationPermissionDenied(false);
      } else if (!cached) {
        setLocationPermissionDenied(true);
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      setLocationPermissionDenied(true);
    }
  };

  const loadJobs = async () => {
    try {
      const jobsData = await JobService.searchJobs(filters, userLocation);
      setJobs(jobsData);

      const ownerIds = jobsData
        .map(j => j.businessOwnerId as UserId | undefined)
        .filter((id): id is UserId => Boolean(id));
      if (ownerIds.length > 0) {
        const aggMap = await ReviewService.getAggregatesForUsers(ownerIds);
        setOwnerAggregates(aggMap);
      } else {
        setOwnerAggregates(new Map());
      }
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      showErrorToast(mapAnyError(error), () => {
        loadJobs();
      });
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
      if (masterDetail) {
        masterDetail.select(jobId);
        return;
      }
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation, masterDetail]
  );

  const renderJob = useCallback(
    ({ item }: { item: Job }) => (
      <JobCardWithDistance
        job={item}
        onPressJobId={handleJobPress}
        ownerAggregate={ownerAggregates.get(item.businessOwnerId as UserId)}
        alreadyApplied={appliedJobIds.has(item.id)}
      />
    ),
    [handleJobPress, ownerAggregates, appliedJobIds]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {t('jobFeed.empty', { defaultValue: 'Нет доступных вакансий' })}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('jobFeed.emptyHintFilters', {
          defaultValue: 'Попробуйте изменить фильтры поиска',
        })}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="50%" height={14} style={styles.skeletonGap} />
              <Skeleton width="40%" height={14} style={styles.skeletonGap} />
              <Skeleton width="30%" height={14} style={styles.skeletonGap} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {showProfileBanner && (
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => navigation.navigate('BaristaProfileSetup')}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              {t('jobFeed.profileBannerTitle', { defaultValue: 'Заполните профиль' })}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {!baristaProfile
                ? t('jobFeed.profileBannerSubtitleNoProfile', {
                    defaultValue: 'Создайте профиль, чтобы выделяться среди кандидатов',
                  })
                : t('jobFeed.profileBannerSubtitlePercent', {
                    percent: baristaProfile.profileCompleteness,
                    defaultValue: 'Профиль заполнен на {{percent}}%',
                  })}
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
  listContent: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  skeletonGap: {
    marginTop: 8,
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
