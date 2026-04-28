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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BaristaStackParamList } from '../../navigation/BaristaStack';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { JobCard } from '../../components/JobCard';
import type { Job } from '../../types/job';

type Props = NativeStackScreenProps<BaristaStackParamList, 'BusinessJobs'>;

const JobCardItem = React.memo<{
  job: Job;
  onPressJobId: (jobId: string) => void;
}>(({ job, onPressJobId }) => <JobCard job={job} onPress={onPressJobId} />);

export const BusinessJobsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { businessOwnerId, businessName } = route.params;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: businessName ?? 'Jobs' });
  }, [navigation, businessName]);

  const loadJobs = useCallback(async () => {
    try {
      const data = await JobService.getJobsByOwnerId(businessOwnerId);
      setJobs(data);
    } catch (error) {
      console.error('Error loading business jobs:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить вакансии этого бизнеса.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [businessOwnerId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadJobs();
  }, [loadJobs]);

  const handleJobPress = useCallback(
    (jobId: string) => {
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation]
  );

  const renderJob = useCallback(
    ({ item }: { item: Job }) => <JobCardItem job={item} onPressJobId={handleJobPress} />,
    [handleJobPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Нет открытых вакансий</Text>
      <Text style={styles.emptySubtext}>У этого бизнеса сейчас нет открытых вакансий.</Text>
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
