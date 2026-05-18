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
import { ApplicationService } from '../../services/ApplicationService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { StarRow } from '../../components/StarRow';
import type { Job } from '../../types/job';
import type { Application } from '../../types/application';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';

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
  const user = useAuthStore(state => state.user);

  const [job, setJob] = useState<Job | null>(null);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [hasCheckedApplication, setHasCheckedApplication] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerAggregate, setOwnerAggregate] = useState<UserReviewAggregate | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobData = await JobService.getJobById(jobId);
        if (cancelled) return;
        setJob(jobData);

        if (jobData?.businessOwnerId) {
          try {
            const agg = await ReviewService.getAggregateForUser(jobData.businessOwnerId as UserId);
            if (!cancelled) setOwnerAggregate(agg);
          } catch (err) {
            console.error('Error loading owner aggregate:', err);
          }
        }

        if (user?.id) {
          const application = await ApplicationService.checkApplicationExists(jobId, user.id);
          if (cancelled) return;
          setExistingApplication(application);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading job details:', err);
        setError('Failed to load job details');
      } finally {
        if (cancelled) return;
        setHasCheckedApplication(true);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, user?.id]);

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
    if (!job || isNavigating) return;
    setIsNavigating(true);
    navigation.navigate('Apply', { job });
    setTimeout(() => setIsNavigating(false), 500);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'accepted':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'pending':
      case 'under_review':
        return '#F59E0B';
      case 'withdrawn':
        return '#6B7280';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return status;
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
            {ownerAggregate && ownerAggregate.reviewCount > 0 && (
              <StarRow
                rating={ownerAggregate.averageRating}
                count={ownerAggregate.reviewCount}
                showValue
                size={13}
              />
            )}
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

      {existingApplication ? (
        <View style={styles.footer}>
          <View style={styles.applicationStatus}>
            <Text style={styles.applicationStatusLabel}>Application Status:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(existingApplication.status) },
              ]}>
              <Text style={styles.statusText}>{getStatusText(existingApplication.status)}</Text>
            </View>
          </View>
          <Text style={styles.applicationDate}>
            Applied: {new Date(existingApplication.createdAt).toLocaleDateString('ru-RU')}
          </Text>
        </View>
      ) : (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.applyButton,
              (!hasCheckedApplication || isNavigating) && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!hasCheckedApplication || isNavigating}>
            <Text style={styles.applyButtonText}>Apply for this Job</Text>
          </TouchableOpacity>
        </View>
      )}
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
    borderRadius: 12,
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
    borderRadius: 999,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  applicationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  applicationStatusLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  applicationDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
