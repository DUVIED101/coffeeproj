import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import type { Job } from '../../types/job';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobDetails'>;
  route: RouteProp<BaristaStackParamList, 'JobDetails'>;
};

export const JobDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId, distance } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const jobData = await JobService.getJobById(jobId);
      setJob(jobData);
    } catch (err) {
      console.error('Error loading job:', err);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (job) {
      navigation.navigate('Apply', { job });
    }
  };

  const formatDistance = (meters: number | undefined): string => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatRecurringDays = (days: string[]): string => {
    const dayMap: Record<string, string> = {
      monday: 'Пн',
      tuesday: 'Вт',
      wednesday: 'Ср',
      thursday: 'Чт',
      friday: 'Пт',
      saturday: 'Сб',
      sunday: 'Вс',
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Job not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadJob}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayDistance = distance !== undefined ? distance : job.distance;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{job.title}</Text>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{job.businessName}</Text>
            <Text style={styles.branchName}>{job.branchName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>{job.location.address}</Text>
          {job.metroStation && (
            <View style={styles.metroContainer}>
              <Text style={styles.metroLabel}>Metro:</Text>
              <Text style={styles.metroStation}>{job.metroStation}</Text>
            </View>
          )}
          {displayDistance !== undefined && (
            <Text style={styles.distance}>{formatDistance(displayDistance)} from you</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(job.shiftDetails.startDate)}</Text>
          </View>
          {job.shiftDetails.endDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Date:</Text>
              <Text style={styles.detailValue}>{formatDate(job.shiftDetails.endDate)}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {job.shiftDetails.startTime} - {job.shiftDetails.endTime}
            </Text>
          </View>
          {job.shiftDetails.isRecurring && job.shiftDetails.recurringDays && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recurring:</Text>
              <Text style={styles.detailValue}>
                {formatRecurringDays(job.shiftDetails.recurringDays)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          <Text style={styles.compensationAmount}>
            {job.compensation.amount.toLocaleString('ru-RU')} ₽
          </Text>
          <Text style={styles.compensationType}>
            {job.compensation.type === 'hourly'
              ? 'per hour'
              : job.compensation.type === 'daily'
                ? 'per day'
                : 'fixed rate'}
          </Text>
        </View>

        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.map((req, index) => (
              <Text key={index} style={styles.bulletItem}>
                • {req}
              </Text>
            ))}
          </View>
        )}

        {job.requiredEquipmentExperience && job.requiredEquipmentExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Equipment Experience</Text>
            {job.requiredEquipmentExperience.map((equipment, index) => (
              <Text key={index} style={styles.bulletItem}>
                • {equipment}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Job Type:</Text>
            <Text style={styles.detailValue}>
              {job.jobType === 'temporary' ? 'Temporary' : 'Permanent'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Applications:</Text>
            <Text style={styles.detailValue}>{job.applicationCount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted:</Text>
            <Text style={styles.detailValue}>{formatDate(job.postedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply for this Job</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  businessInfo: {
    gap: 4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  branchName: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  metroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metroLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  metroStation: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  compensationAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  compensationType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  bulletItem: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
