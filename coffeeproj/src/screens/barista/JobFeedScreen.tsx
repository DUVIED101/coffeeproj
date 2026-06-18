import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { queryKeys } from '../../lib/queryClient';
import {
  requestLocationPermission,
  getCurrentLocation,
  getLastKnownLocationFast,
} from '../../utils/geolocation';
import type { Job, JobFilters } from '../../types/job';
import type { GeoPoint } from '../../types/business';
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
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(undefined);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({});

  const isFocused = useIsFocused();
  const userId = user?.id;

  useEffect(() => {
    void initializeLocation();
  }, []);

  const initializeLocation = async (): Promise<void> => {
    try {
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

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.search(filters, userLocation ?? null),
    queryFn: () => JobService.searchJobs(filters, userLocation),
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.baristaProfile.byUserId(userId ?? ''),
    queryFn: () => BaristaProfileService.getProfileByUserId(userId as string),
    enabled: Boolean(userId),
  });

  const appliedQuery = useQuery({
    queryKey: queryKeys.applications.appliedJobIds(userId ?? ''),
    queryFn: () => ApplicationService.getActiveAppliedJobIds(userId as string),
    enabled: Boolean(userId),
  });

  const ownerIds = useMemo<ReadonlyArray<UserId>>(
    () =>
      (jobsQuery.data ?? [])
        .map(j => j.businessOwnerId as UserId | undefined)
        .filter((id): id is UserId => Boolean(id)),
    [jobsQuery.data]
  );

  const ownerAggregatesQuery = useQuery({
    queryKey: queryKeys.reviews.aggregatesForUsers(ownerIds as ReadonlyArray<string>),
    queryFn: () => ReviewService.getAggregatesForUsers([...ownerIds]),
    enabled: ownerIds.length > 0,
  });

  // Surface fetch failures to the user with retry-via-toast, matching previous behaviour.
  useEffect(() => {
    if (jobsQuery.error) {
      console.error('❌ Error loading jobs:', jobsQuery.error);
      showErrorToast(mapAnyError(jobsQuery.error), () => {
        void jobsQuery.refetch();
      });
    }
  }, [jobsQuery.error, jobsQuery.refetch]);

  // Re-fetch profile and applied job IDs whenever the tab regains focus, e.g.
  // after the user finishes BaristaProfileSetup in the Profile tab. Filter
  // results don't need a focus refetch — they're keyed on filters/location.
  useEffect(() => {
    if (!isFocused || !userId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.baristaProfile.byUserId(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.applications.appliedJobIds(userId) });
  }, [isFocused, userId, queryClient]);

  const jobs = jobsQuery.data ?? [];
  const appliedJobIds = appliedQuery.data ?? new Set<string>();
  const ownerAggregates = ownerAggregatesQuery.data ?? new Map<UserId, UserReviewAggregate>();
  const baristaProfile = profileQuery.data ?? null;
  // Banner threshold matches the apply gate in JobDetailsScreen (20%).
  const showProfileBanner =
    profileQuery.isSuccess && (!baristaProfile || baristaProfile.profileCompleteness < 20);

  const handleRefresh = useCallback(async (): Promise<void> => {
    await jobsQuery.refetch();
  }, [jobsQuery]);

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

  if (jobsQuery.isPending) {
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
            refreshing={jobsQuery.isFetching && !jobsQuery.isPending}
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
