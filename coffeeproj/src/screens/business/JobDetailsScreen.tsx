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
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { useAuthStore } from '../../stores/authStore';
import type { Job, JobStatus } from '../../types/job';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'JobDetails'>;
  route: RouteProp<BusinessStackParamList, 'JobDetails'>;
};

export const JobDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await JobService.getJobById(jobId);
      setJob(data);
    } catch (err) {
      console.error('Error loading job:', err);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewApplicants = () => {
    navigation.navigate('Applicants', { jobId });
  };

  const transitionStatus = async (
    nextStatus: JobStatus,
    successKey: 'job.markFilled.success' | 'job.cancel.success' | 'job.reopen.success'
  ) => {
    if (!user) return;
    try {
      setIsUpdatingStatus(true);
      await JobService.updateJobStatus(jobId, nextStatus, user.id);
      await loadJob();
      Alert.alert(t('common.success'), t(successKey));
    } catch (err) {
      console.error('Error updating job status:', err);
      Alert.alert(t('common.error'), t('job.errors.updateFailed'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const confirmTransition = (
    titleKey: 'job.markFilled.confirmTitle' | 'job.cancel.confirmTitle' | 'job.reopen.confirmTitle',
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
        onPress: () => transitionStatus(nextStatus, successKey),
      },
    ]);
  };

  const handleMarkFilled = () =>
    confirmTransition(
      'job.markFilled.confirmTitle',
      'job.markFilled.confirmBody',
      'filled',
      'job.markFilled.success'
    );

  const handleCancelJob = () =>
    confirmTransition(
      'job.cancel.confirmTitle',
      'job.cancel.confirmBody',
      'cancelled',
      'job.cancel.success',
      true
    );

  const handleReopenJob = () =>
    confirmTransition(
      'job.reopen.confirmTitle',
      'job.reopen.confirmBody',
      'open',
      'job.reopen.success'
    );

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatRecurringDays = (days: string[]): string => {
    return days.join(', ');
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

  const hasApplicants = job.applicationCount > 0;
  const canClose = job.status === 'open' || job.status === 'in_review';
  const canReopen = job.status === 'filled' || job.status === 'cancelled';
  const showFooter = hasApplicants || canClose || canReopen;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{job.title}</Text>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{job.businessName}</Text>
            {job.branchName && <Text style={styles.branchName}>{job.branchName}</Text>}
          </View>
        </View>

        {/* Application Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statLabel}>Applications</Text>
          <Text style={styles.statValue}>
            {job.applicationCount === 0
              ? 'No applicants yet'
              : `${job.applicationCount} applicant${job.applicationCount !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>{job.location.address}</Text>
          {job.metroStation && (
            <View style={styles.metroContainer}>
              <Text style={styles.metroLabel}>Metro:</Text>
              <Text style={styles.metroStation}>{job.metroStation}</Text>
            </View>
          )}
        </View>

        {/* Shift Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(job.shiftDetails.startDate)}
              {job.shiftDetails.endDate && ` - ${formatDate(job.shiftDetails.endDate)}`}
            </Text>
          </View>
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

        {/* Compensation */}
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
          {job.payment && (
            <View style={styles.paymentDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Fee (15%):</Text>
                <Text style={styles.detailValue}>
                  {job.payment.platformFee.toLocaleString('ru-RU')} ₽
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Cost:</Text>
                <Text style={[styles.detailValue, styles.totalCost]}>
                  {job.payment.totalWithFee.toLocaleString('ru-RU')} ₽
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
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

        {/* Required Equipment Experience */}
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

        {/* Job Info */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Job Type:</Text>
            <Text style={styles.detailValue}>
              {job.jobType === 'temporary' ? 'Temporary' : 'Permanent'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={styles.detailValue}>{job.status}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted:</Text>
            <Text style={styles.detailValue}>{formatDate(job.postedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      {showFooter && (
        <View style={styles.footer}>
          {hasApplicants && (
            <TouchableOpacity style={styles.viewApplicantsButton} onPress={handleViewApplicants}>
              <Text style={styles.viewApplicantsButtonText}>
                View {job.applicationCount} Applicant{job.applicationCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
          {canClose && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction]}
                onPress={handleMarkFilled}
                disabled={isUpdatingStatus}>
                <Text style={styles.primaryActionText}>{t('job.actions.markFilled')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.destructiveAction]}
                onPress={handleCancelJob}
                disabled={isUpdatingStatus}>
                <Text style={styles.destructiveActionText}>{t('job.actions.cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
          {canReopen && (
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineAction]}
              onPress={handleReopenJob}
              disabled={isUpdatingStatus}>
              <Text style={styles.outlineActionText}>{t('job.actions.reopen')}</Text>
            </TouchableOpacity>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  businessInfo: {
    marginTop: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  compensationAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  compensationType: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  paymentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalCost: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  bulletItem: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewApplicantsButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewApplicantsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveAction: {
    backgroundColor: COLORS.error,
  },
  destructiveActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineAction: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  outlineActionText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
