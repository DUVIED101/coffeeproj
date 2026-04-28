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

const STATUS_TABS: { label: string; value: JobStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Filled', value: 'filled' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Expired', value: 'expired' },
];

export const ManageJobsScreen: React.FC<Props> = ({ navigation }) => {
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

  const filteredJobs = jobs.filter(job => job.status === selectedStatus);

  const renderJob = useCallback(
    ({ item }: { item: Job }) => <JobCard job={item} onPress={handleJobPress} />,
    [handleJobPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No {selectedStatus} jobs</Text>
      <Text style={styles.emptySubtext}>Jobs with this status will appear here</Text>
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
        <Text style={styles.title}>Manage Jobs</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateJob')}>
          <Text style={styles.createButtonText}>+ Create Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {STATUS_TABS.map(tab => {
          const count = jobs.filter(job => job.status === tab.value).length;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, selectedStatus === tab.value && styles.tabActive]}
              onPress={() => setSelectedStatus(tab.value)}>
              <Text style={[styles.tabText, selectedStatus === tab.value && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  selectedStatus === tab.value && styles.countBadgeActive,
                ]}>
                <Text
                  style={[
                    styles.countText,
                    selectedStatus === tab.value && styles.countTextActive,
                  ]}>
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
    borderRadius: 8,
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
    borderRadius: 10,
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
