import React, { useState, useEffect } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import { JobCard } from '../../components/JobCard';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { JobService } from '../../services/JobService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../config/constants';
import type { Job, Branch, JobStatus } from '../../types';

const SHOW_ARCHIVED_KEY = 'business.showArchivedJobs';
const ARCHIVED_STATUSES: JobStatus[] = ['filled', 'expired', 'cancelled'];

type BusinessHomeScreenProps = NativeStackScreenProps<BusinessStackParamList, 'BusinessHome'>;

type TabType = 'jobs' | 'branches';

export const BusinessHomeScreen: React.FC<BusinessHomeScreenProps> = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const { businessId } = route.params;
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Jobs tab state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('open');
  const [showArchived, setShowArchived] = useState(false);

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
    if (next === false && ARCHIVED_STATUSES.includes(selectedStatus)) {
      setSelectedStatus('open');
    }
    try {
      await AsyncStorage.setItem(SHOW_ARCHIVED_KEY, next ? 'true' : 'false');
    } catch (err) {
      console.error('Error persisting showArchived pref:', err);
    }
  };

  // Branches tab state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isRefreshingBranches, setIsRefreshingBranches] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <ScreenHeaderWithActions
          title="My Business"
          actions={[{ label: 'Chats', onPress: () => navigation.navigate('ConversationsList') }]}
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    } else {
      loadBranches();
    }
  }, [activeTab]);

  // Reload jobs when screen comes into focus (e.g., after creating a job)
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'jobs') {
        loadJobs();
      } else {
        loadBranches();
      }
    }, [activeTab])
  );

  const loadJobs = async () => {
    if (!user?.id) return;

    setIsLoadingJobs(true);
    try {
      const fetchedJobs = await JobService.getJobsByBusinessId(businessId);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const loadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const data = await BusinessService.getBranches(businessId);
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleRefreshJobs = async () => {
    setIsRefreshingJobs(true);
    await loadJobs();
    setIsRefreshingJobs(false);
  };

  const handleRefreshBranches = async () => {
    setIsRefreshingBranches(true);
    await loadBranches();
    setIsRefreshingBranches(false);
  };

  const handleJobPress = (jobId: string) => {
    navigation.navigate('JobDetails', { jobId });
  };

  const handleCreateJob = () => {
    navigation.navigate('CreateJob');
  };

  const handleManageBranches = () => {
    navigation.navigate('BranchManagement', { businessId });
  };

  const filteredJobs = jobs.filter(job => job.status === selectedStatus);

  const ALL_STATUS_TABS: Array<{ label: string; value: JobStatus }> = [
    { label: 'Open', value: 'open' },
    { label: 'In Review', value: 'in_review' },
    { label: 'Filled', value: 'filled' },
    { label: 'Expired', value: 'expired' },
    { label: 'Cancelled', value: 'cancelled' },
  ];
  const visibleStatusTabs = showArchived
    ? ALL_STATUS_TABS
    : ALL_STATUS_TABS.filter(tab => !ARCHIVED_STATUSES.includes(tab.value));

  const renderJobsTab = () => (
    <View style={styles.tabContent}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusTabs}
        contentContainerStyle={styles.statusTabsContent}>
        {visibleStatusTabs.map(item => (
          <TouchableOpacity
            key={item.value}
            style={[styles.statusTab, selectedStatus === item.value && styles.statusTabActive]}
            onPress={() => setSelectedStatus(item.value)}>
            <Text
              style={[
                styles.statusTabText,
                selectedStatus === item.value && styles.statusTabTextActive,
              ]}>
              {item.label}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {jobs.filter(j => j.status === item.value).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={styles.archiveToggle}>
          <Text style={styles.archiveToggleText}>{t('business.jobs.showArchived')}</Text>
          <Switch
            value={showArchived}
            onValueChange={toggleShowArchived}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      {isLoadingJobs ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={() => handleJobPress(item.id)} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshingJobs} onRefresh={handleRefreshJobs} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No {selectedStatus} jobs yet</Text>
            </View>
          }
        />
      )}

      {/* Create Job FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateJob}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBranchesTab = () => (
    <View style={styles.tabContent}>
      {isLoadingBranches ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.branchCard}>
              <Text style={styles.branchName}>{item.name}</Text>
              <Text style={styles.branchAddress}>{item.address}</Text>
              <Text style={styles.branchMetro}>{item.metroStation}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshingBranches} onRefresh={handleRefreshBranches} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No branches yet</Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={handleManageBranches}>
                <Text style={styles.emptyStateButtonText}>Add Branch</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleManageBranches}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
          onPress={() => setActiveTab('jobs')}>
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'branches' && styles.tabActive]}
          onPress={() => setActiveTab('branches')}>
          <Text style={[styles.tabText, activeTab === 'branches' && styles.tabTextActive]}>
            Branches
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'jobs' ? renderJobsTab() : renderBranchesTab()}
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
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
  },
  archiveToggleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusTabs: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexGrow: 0,
  },
  statusTabsContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
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
    borderRadius: 10,
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
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  emptyStateButtonText: {
    fontSize: 14,
    color: COLORS.background,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.background,
    fontWeight: '300',
  },
  branchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  branchName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  branchAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  branchMetro: {
    fontSize: 14,
    color: COLORS.primary,
  },
});
