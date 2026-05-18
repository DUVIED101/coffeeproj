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
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import { JobCard } from '../../components/JobCard';
import type { Job, JobStatus } from '../../types/job';

type BusinessStackParamList = {
  CreateJob: undefined;
  ManageJobs: undefined;
  JobDetails: { jobId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'ManageJobs'>;
};

const STATUS_TABS: JobStatus[] = ['open', 'filled', 'cancelled', 'expired'];

const getTabLabelKey = (status: JobStatus): string => {
  switch (status) {
    case 'open':
      return 'jobStatus.open';
    case 'filled':
      return 'jobStatus.filled';
    case 'cancelled':
      return 'jobStatus.cancelled';
    case 'expired':
      return 'jobStatus.expired';
    case 'in_review':
      return 'jobStatus.inReview';
    default:
      return status;
  }
};

export const ManageJobsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('open');

  const loadJobs = useCallback(async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    try {
      const business = await BusinessService.getBusinessByOwnerId(userId);
      if (business) {
        const jobsData = await JobService.getJobsByBusinessId(business.id);
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadJobs();
  };

  const handleJobPress = useCallback(
    (jobId: string) => {
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation]
  );

  const transitionStatus = useCallback(
    async (
      job: Job,
      nextStatus: JobStatus,
      successKey: 'job.markFilled.success' | 'job.cancel.success' | 'job.reopen.success'
    ) => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      try {
        await JobService.updateJobStatus(job.id, nextStatus, userId);
        await loadJobs();
        Alert.alert(t('common.success'), t(successKey));
      } catch (err) {
        console.error('Error updating job status:', err);
        Alert.alert(t('common.error'), t('job.errors.updateFailed'));
      }
    },
    [loadJobs, t]
  );

  const confirmTransition = useCallback(
    (
      job: Job,
      titleKey:
        | 'job.markFilled.confirmTitle'
        | 'job.cancel.confirmTitle'
        | 'job.reopen.confirmTitle',
      bodyKey: 'job.markFilled.confirmBody' | 'job.cancel.confirmBody' | 'job.reopen.confirmBody',
      nextStatus: JobStatus,
      successKey: 'job.markFilled.success' | 'job.cancel.success' | 'job.reopen.success',
      destructive = false
    ) => {
      Alert.alert(t(titleKey), t(bodyKey), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: destructive ? 'destructive' : 'default',
          onPress: () => transitionStatus(job, nextStatus, successKey),
        },
      ]);
    },
    [t, transitionStatus]
  );

  const handleJobLongPress = useCallback(
    (job: Job) => {
      const actions: { label: string; run: () => void; destructive?: boolean }[] = [];
      if (job.status === 'open' || job.status === 'in_review') {
        actions.push({
          label: t('job.actions.markFilled'),
          run: () =>
            confirmTransition(
              job,
              'job.markFilled.confirmTitle',
              'job.markFilled.confirmBody',
              'filled',
              'job.markFilled.success'
            ),
        });
        actions.push({
          label: t('job.actions.cancel'),
          destructive: true,
          run: () =>
            confirmTransition(
              job,
              'job.cancel.confirmTitle',
              'job.cancel.confirmBody',
              'cancelled',
              'job.cancel.success',
              true
            ),
        });
      } else if (
        job.status === 'filled' ||
        job.status === 'cancelled' ||
        job.status === 'expired'
      ) {
        actions.push({
          label: t('job.actions.reopen'),
          run: () =>
            confirmTransition(
              job,
              'job.reopen.confirmTitle',
              'job.reopen.confirmBody',
              'open',
              'job.reopen.success'
            ),
        });
      }
      if (actions.length === 0) return;

      if (Platform.OS === 'ios') {
        const options = [...actions.map(a => a.label), t('common.cancel')];
        const cancelButtonIndex = options.length - 1;
        const destructiveButtonIndex = actions.findIndex(a => a.destructive);
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            destructiveButtonIndex:
              destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          },
          buttonIndex => {
            if (buttonIndex === cancelButtonIndex) return;
            actions[buttonIndex]?.run();
          }
        );
      } else {
        Alert.alert(job.title, undefined, [
          ...actions.map(a => ({
            text: a.label,
            style: a.destructive ? ('destructive' as const) : ('default' as const),
            onPress: a.run,
          })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ]);
      }
    },
    [confirmTransition, t]
  );

  const filteredJobs = jobs.filter(job => job.status === selectedStatus);

  const renderJob = useCallback(
    ({ item }: { item: Job }) => (
      <JobCard job={item} onPress={handleJobPress} onLongPress={handleJobLongPress} />
    ),
    [handleJobPress, handleJobLongPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {t('manageJobs.empty', { status: t(getTabLabelKey(selectedStatus)).toLowerCase() })}
      </Text>
      <Text style={styles.emptySubtext}>{t('manageJobs.emptyHint')}</Text>
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
        <Text style={styles.title}>{t('manageJobs.title')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateJob')}>
          <Text style={styles.createButtonText}>{t('manageJobs.create')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {STATUS_TABS.map(status => {
          const count = jobs.filter(job => job.status === status).length;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.tab, selectedStatus === status && styles.tabActive]}
              onPress={() => setSelectedStatus(status)}>
              <Text style={[styles.tabText, selectedStatus === status && styles.tabTextActive]}>
                {t(getTabLabelKey(status))}
              </Text>
              <View
                style={[styles.countBadge, selectedStatus === status && styles.countBadgeActive]}>
                <Text
                  style={[styles.countText, selectedStatus === status && styles.countTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredJobs}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  countText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  countTextActive: {
    color: '#fff',
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
  },
});
