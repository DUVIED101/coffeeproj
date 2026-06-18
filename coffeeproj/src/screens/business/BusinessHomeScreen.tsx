import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import { JobCard } from '../../components/JobCard';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { ShiftCard } from '../../components/ShiftCard';
import { ShiftFilterSheet } from '../../components/ShiftFilterSheet';
import { Skeleton } from '../../components/Skeleton';
import { AddFab } from '../../components/AddFab';
import type { ShiftFilters } from '../../components/ShiftFilterSheet';
import { JobService } from '../../services/JobService';
import { ApplicationService } from '../../services/ApplicationService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { COLORS, RADII } from '../../config/constants';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { classifyShiftLifecycle } from '../../utils/shiftLifecycle';
import type { Job, JobStatus } from '../../types';
import type { Application, ShiftLifecycleStatus } from '../../types/application';

const SHOW_ARCHIVED_KEY = 'business.showArchivedJobs';
const ARCHIVED_STATUSES: JobStatus[] = ['filled', 'expired', 'cancelled'];

type BusinessHomeScreenProps = NativeStackScreenProps<BusinessStackParamList, 'BusinessHome'>;

type TabType = 'jobs' | 'shifts';

type LifecycleTabValue = ShiftLifecycleStatus | 'all';

type ShiftEntry = {
  job: Job;
  applications: Application[];
  lifecycle: ShiftLifecycleStatus;
};

const LIFECYCLE_TAB_VALUES: LifecycleTabValue[] = [
  'all',
  'open',
  'under_review',
  'accepted',
  'in_progress',
  'completed',
];

export const BusinessHomeScreen: React.FC<BusinessHomeScreenProps> = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const user = useAuthStore(s => s.user);
  const { t } = useTranslation();
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);

  // Resolve the businessId on every focus so the screen reflects newly created
  // profiles without an app restart. Param value (if any) seeds the initial render.
  const [businessId, setBusinessId] = useState<string | undefined>(route.params?.businessId);
  const [isResolvingBusiness, setIsResolvingBusiness] = useState(!route.params?.businessId);

  const handleGoToProfile = useCallback(() => {
    const parent = navigation.getParent();
    parent?.navigate('Profile' as never);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const resolve = async () => {
        if (!user?.id) {
          setIsResolvingBusiness(false);
          return;
        }
        try {
          const business = await BusinessService.getBusinessByOwnerId(user.id);
          if (!cancelled) setBusinessId(business?.id);
        } catch (error) {
          console.error('Error resolving business in home screen:', error);
        } finally {
          if (!cancelled) setIsResolvingBusiness(false);
        }
      };
      resolve();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  // Shared jobs state — used by both jobs tab and shifts tab
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('open');
  const [showArchived, setShowArchived] = useState(false);
  const pillOffsetsRef = useRef<Record<string, number>>({});
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);

  // Shifts tab state
  const [shiftApplications, setShiftApplications] = useState<Application[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isRefreshingShifts, setIsRefreshingShifts] = useState(false);
  const [selectedLifecycle, setSelectedLifecycle] = useState<LifecycleTabValue>('all');
  const [shiftFilters, setShiftFilters] = useState<ShiftFilters>({ includeArchive: false });
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SHOW_ARCHIVED_KEY)
      .then(value => {
        if (value === 'true') setShowArchived(true);
      })
      .catch(err => console.error('Error loading showArchived pref:', err));
  }, []);

  const toggleShowArchived = async () => {
    const next = !showArchived;
    setShowArchived(next);
    pillOffsetsRef.current = {};
    setSnapOffsets([]);
    if (next === false && ARCHIVED_STATUSES.includes(selectedStatus)) {
      setSelectedStatus('open');
    }
    try {
      await AsyncStorage.setItem(SHOW_ARCHIVED_KEY, next ? 'true' : 'false');
    } catch (err) {
      console.error('Error persisting showArchived pref:', err);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <ScreenHeaderWithActions
          title={t('business.home.title')}
          actions={[
            {
              icon: 'bell-outline',
              badgeCount: unreadCount,
              onPress: () => navigation.navigate('NotificationFeed'),
              testID: 'bell',
            },
          ]}
        />
      ),
    });
  }, [navigation, unreadCount, t]);

  const loadJobs = useCallback(async () => {
    if (!user?.id || !businessId) return;
    setIsLoadingJobs(true);
    try {
      const fetchedJobs = await JobService.getJobsByBusinessId(businessId);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [businessId, user?.id]);

  const loadShifts = useCallback(async () => {
    if (!businessId) return;
    setIsLoadingShifts(true);
    try {
      const [fetchedApps, fetchedJobs] = await Promise.all([
        ApplicationService.getApplicationsByBusiness(businessId),
        JobService.getJobsByBusinessId(businessId),
      ]);
      setShiftApplications(fetchedApps);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setIsLoadingShifts(false);
    }
  }, [businessId]);

  // Combined focus + tab-switch loader. useFocusEffect re-fires on focus AND
  // whenever its callback identity changes, so depending on `activeTab` lets
  // us drop a parallel useEffect (which was double-firing on mount-and-focus
  // and ~doubling egress on this screen).
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'jobs') {
        loadJobs();
      } else {
        loadShifts();
      }
    }, [activeTab, loadJobs, loadShifts])
  );

  const handleRefreshJobs = async () => {
    setIsRefreshingJobs(true);
    await loadJobs();
    setIsRefreshingJobs(false);
  };

  const handleRefreshShifts = async () => {
    setIsRefreshingShifts(true);
    await loadShifts();
    setIsRefreshingShifts(false);
  };

  const handleJobPress = useCallback(
    (jobId: string) => {
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation]
  );

  const handleCreateJob = () => {
    navigation.navigate('CreateJob');
  };

  const handleShiftCardPressApplicants = useCallback(
    (jobId: string) => {
      navigation.navigate('Applicants', { jobId });
    },
    [navigation]
  );

  const handleShiftCardPressChat = useCallback(
    (application: Application) => {
      navigation
        .getParent()
        ?.navigate('Chats', { screen: 'Chat', params: { applicationId: application.id } });
    },
    [navigation]
  );

  const filteredJobs = useMemo(
    () => jobs.filter(job => job.status === selectedStatus),
    [jobs, selectedStatus]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      open: 0,
      in_review: 0,
      filled: 0,
      expired: 0,
      cancelled: 0,
    };
    for (const job of jobs) counts[job.status] = (counts[job.status] ?? 0) + 1;
    return counts;
  }, [jobs]);

  const shiftEntries = useMemo<ShiftEntry[]>(() => {
    const appsByJobId = new Map<string, Application[]>();
    for (const app of shiftApplications) {
      const list = appsByJobId.get(app.jobId) ?? [];
      list.push(app);
      appsByJobId.set(app.jobId, list);
    }
    return jobs.map(job => {
      const apps = appsByJobId.get(job.id) ?? [];
      return { job, applications: apps, lifecycle: classifyShiftLifecycle(job, apps) };
    });
  }, [jobs, shiftApplications]);

  const lifecycleCounts = useMemo(() => {
    const counts: Record<LifecycleTabValue, number> = {
      all: 0,
      open: 0,
      under_review: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
    };
    for (const entry of shiftEntries) {
      counts.all += 1;
      counts[entry.lifecycle] += 1;
    }
    return counts;
  }, [shiftEntries]);

  const filteredShiftEntries = useMemo(() => {
    return shiftEntries.filter(entry => {
      if (selectedLifecycle !== 'all' && entry.lifecycle !== selectedLifecycle) return false;
      // Archive toggle only hides completed when viewing "all" — picking the
      // Completed pill explicitly should always show completed shifts.
      if (
        selectedLifecycle === 'all' &&
        !shiftFilters.includeArchive &&
        entry.lifecycle === 'completed'
      ) {
        return false;
      }
      if (shiftFilters.jobType && entry.job.jobType !== shiftFilters.jobType) return false;
      if (shiftFilters.metroStations && shiftFilters.metroStations.length > 0) {
        const station = entry.job.metroStation ?? entry.job.location.metroStation;
        if (!station || !shiftFilters.metroStations.includes(station)) return false;
      }
      if (shiftFilters.equipment && shiftFilters.equipment.length > 0) {
        const overlap = shiftFilters.equipment.some(eq =>
          entry.job.requiredEquipmentExperience.includes(eq)
        );
        if (!overlap) return false;
      }
      return true;
    });
  }, [shiftEntries, selectedLifecycle, shiftFilters]);

  const ALL_STATUS_TABS: Array<{ label: string; value: JobStatus }> = [
    { label: t('business.jobs.status.open'), value: 'open' },
    { label: t('business.jobs.status.in_review'), value: 'in_review' },
    { label: t('business.jobs.status.filled'), value: 'filled' },
    { label: t('business.jobs.status.expired'), value: 'expired' },
    { label: t('business.jobs.status.cancelled'), value: 'cancelled' },
  ];
  const visibleStatusTabs = showArchived
    ? ALL_STATUS_TABS
    : ALL_STATUS_TABS.filter(tab => !ARCHIVED_STATUSES.includes(tab.value));

  const renderJobsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.archiveToggleRow}>
        <Text style={styles.archiveToggleText}>{t('business.jobs.showArchived')}</Text>
        <Switch
          value={showArchived}
          onValueChange={toggleShowArchived}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.statusTabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          style={styles.statusTabs}
          contentContainerStyle={styles.statusTabsContent}>
          {visibleStatusTabs.map(item => (
            <TouchableOpacity
              key={item.value}
              style={[styles.statusTab, selectedStatus === item.value && styles.statusTabActive]}
              onPress={() => setSelectedStatus(item.value)}
              onLayout={e => {
                pillOffsetsRef.current[item.value] = e.nativeEvent.layout.x;
                const ordered = visibleStatusTabs
                  .map(s => pillOffsetsRef.current[s.value])
                  .filter((x): x is number => typeof x === 'number');
                if (ordered.length === visibleStatusTabs.length) {
                  setSnapOffsets(prev => {
                    if (prev.length === ordered.length && prev.every((v, i) => v === ordered[i])) {
                      return prev;
                    }
                    return ordered;
                  });
                }
              }}>
              <Text
                style={[
                  styles.statusTabText,
                  selectedStatus === item.value && styles.statusTabTextActive,
                ]}>
                {item.label}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{statusCounts[item.value]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.statusTabsFade} pointerEvents="none">
          {[0, 0.15, 0.35, 0.6, 0.85, 1].map((opacity, i) => (
            <View
              key={i}
              style={[styles.statusTabsFadeStrip, { backgroundColor: COLORS.background, opacity }]}
            />
          ))}
        </View>
      </View>

      {isLoadingJobs ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="50%" height={14} style={styles.skeletonGap} />
              <Skeleton width="35%" height={14} style={styles.skeletonGap} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={handleJobPress} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshingJobs} onRefresh={handleRefreshJobs} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {t('business.home.emptyJobs', {
                  status: t(`business.jobs.status.${selectedStatus}`).toLowerCase(),
                })}
              </Text>
            </View>
          }
        />
      )}

      <AddFab onPress={handleCreateJob} accessibilityLabel={t('manageJobs.create')} />
    </View>
  );

  const activeFilterCount =
    (shiftFilters.jobType ? 1 : 0) +
    (shiftFilters.metroStations && shiftFilters.metroStations.length > 0 ? 1 : 0) +
    (shiftFilters.equipment && shiftFilters.equipment.length > 0 ? 1 : 0) +
    (shiftFilters.includeArchive ? 1 : 0);

  const renderShiftsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.shiftToolbar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterSheetVisible(true)}
          accessibilityRole="button">
          <MaterialCommunityIcons name="filter-variant" size={18} color={COLORS.text} />
          <Text style={styles.filterButtonText}>{t('shifts.filter.title')}</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.statusTabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusTabs}
          contentContainerStyle={styles.statusTabsContent}>
          {LIFECYCLE_TAB_VALUES.map(value => (
            <TouchableOpacity
              key={value}
              style={[styles.statusTab, selectedLifecycle === value && styles.statusTabActive]}
              onPress={() => setSelectedLifecycle(value)}>
              <Text
                style={[
                  styles.statusTabText,
                  selectedLifecycle === value && styles.statusTabTextActive,
                ]}>
                {value === 'all' ? t('shifts.lifecycle.all') : t(`shifts.status.${value}`)}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{lifecycleCounts[value]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.statusTabsFade} pointerEvents="none">
          {[0, 0.15, 0.35, 0.6, 0.85, 1].map((opacity, i) => (
            <View
              key={i}
              style={[styles.statusTabsFadeStrip, { backgroundColor: COLORS.background, opacity }]}
            />
          ))}
        </View>
      </View>

      {isLoadingShifts ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="65%" height={17} />
              <Skeleton width="45%" height={14} style={styles.skeletonGap} />
              <Skeleton width="55%" height={14} style={styles.skeletonGap} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredShiftEntries}
          keyExtractor={item => item.job.id}
          renderItem={({ item }) => (
            <ShiftCard
              job={item.job}
              applications={item.applications}
              lifecycle={item.lifecycle}
              onPressApplicants={handleShiftCardPressApplicants}
              onPressAcceptedChat={handleShiftCardPressChat}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshingShifts} onRefresh={handleRefreshShifts} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('shifts.empty')}</Text>
            </View>
          }
        />
      )}

      <ShiftFilterSheet
        visible={filterSheetVisible}
        initialFilters={shiftFilters}
        onApply={setShiftFilters}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );

  if (isResolvingBusiness) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gateContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!businessId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gateContainer}>
          <MaterialCommunityIcons
            name="storefront-outline"
            size={56}
            color={COLORS.textSecondary}
          />
          <Text style={styles.gateTitle}>{t('businessGate.title')}</Text>
          <Text style={styles.gateSubtitle}>{t('businessGate.subtitle')}</Text>
          <TouchableOpacity style={styles.gateCta} onPress={handleGoToProfile}>
            <Text style={styles.gateCtaText}>{t('businessGate.cta')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth={720}>
        {/* Main Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
            onPress={() => setActiveTab('jobs')}>
            <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
              {t('business.tabs.jobs')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shifts' && styles.tabActive]}
            onPress={() => setActiveTab('shifts')}>
            <Text style={[styles.tabText, activeTab === 'shifts' && styles.tabTextActive]}>
              {t('business.tabs.shifts')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'jobs' ? renderJobsTab() : renderShiftsTab()}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  archiveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  archiveToggleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusTabsWrap: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusTabs: {
    flexGrow: 0,
  },
  statusTabsFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    flexDirection: 'row',
  },
  statusTabsFadeStrip: {
    flex: 1,
  },
  statusTabsContent: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 48,
    gap: 8,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusTabText: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 6,
  },
  statusTabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: COLORS.border,
    borderRadius: RADII.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  loader: {
    marginTop: 32,
  },
  skeletonList: {
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
  listContent: {
    padding: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  gateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  gateCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.pill,
  },
  gateCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  shiftToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.pill,
    paddingHorizontal: 6,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  filterBadgeText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '700',
  },
});
