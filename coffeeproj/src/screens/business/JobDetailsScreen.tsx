import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, type RouteProp } from '@react-navigation/native';
import { COLORS, SHOW_PLATFORM_FEE } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { JobOfferService } from '../../services/JobOfferService';
import { useAuthStore } from '../../stores/authStore';
import { BranchPhotoGallery } from '../../components/BranchPhotoGallery';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import type { Job, JobStatus } from '../../types/job';
import type { JobId } from '../../types/ids';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import { showErrorToast } from '../../stores/errorToastStore';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'JobDetails'>;
  route: RouteProp<BusinessStackParamList, 'JobDetails'>;
};

export const JobDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const [job, setJob] = useState<Job | null>(null);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadJob = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, offers] = await Promise.all([
        JobService.getJobById(jobId),
        JobOfferService.getPendingOffersForJob(jobId as JobId).catch(err => {
          console.error('Error loading pending offers:', err);
          return [];
        }),
      ]);
      setJob(data);
      setPendingOfferCount(offers.length);
    } catch (err) {
      console.error('Error loading job:', err);
      setError(t('businessJobDetails.errorLoadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId, t]);

  // Refresh on every focus so returning from EditJob picks up the saved changes.
  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob])
  );

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
      showErrorToast(t('job.errors.updateFailed'));
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
          <Text style={styles.errorText}>{error || t('businessJobDetails.errorNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadJob}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasApplicants = job.applicationCount > 0;
  const hasPendingOffers = pendingOfferCount > 0;
  const canViewApplicants = hasApplicants || hasPendingOffers;
  const canClose = job.status === 'open' || job.status === 'in_review';
  const canReopen = job.status === 'filled' || job.status === 'cancelled';
  const canEdit = job.status === 'open';
  const showFooter = canViewApplicants || canClose || canReopen || canEdit;

  const handleEdit = () => navigation.navigate('EditJob', { jobId });

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
          <Text style={styles.statLabel}>{t('businessJobDetails.applicationsLabel')}</Text>
          <Text style={styles.statValue}>
            {job.applicationCount === 0
              ? t('businessJobDetails.noApplicantsYet')
              : t('businessJobDetails.applicantsCount', { count: job.applicationCount })}
          </Text>
        </View>

        {job.branchPhotos && job.branchPhotos.length > 0 && (
          <View style={styles.section}>
            <BranchPhotoGallery
              photos={job.branchPhotos}
              onPhotoPress={index => {
                setViewerIndex(index);
                setViewerVisible(true);
              }}
            />
          </View>
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('businessJobDetails.location')}</Text>
          <Text style={styles.address}>{job.location.address}</Text>
          {job.metroStation && (
            <View style={styles.metroContainer}>
              <Text style={styles.metroLabel}>{t('businessJobDetails.metroLabel')}</Text>
              <Text style={styles.metroStation}>{job.metroStation}</Text>
            </View>
          )}
        </View>

        {/* Shift Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('businessJobDetails.shiftDetails')}</Text>
          {job.shiftDetails.kind === 'permanent' ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.startDatePermanent')}</Text>
                <Text style={styles.detailValue}>{formatDate(job.shiftDetails.startDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.hoursPerWeek')}</Text>
                <Text style={styles.detailValue}>{job.shiftDetails.hoursPerWeek}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.preferredDays')}</Text>
                <Text style={styles.detailValue}>
                  {job.shiftDetails.preferredDays && job.shiftDetails.preferredDays.length > 0
                    ? job.shiftDetails.preferredDays
                        .map(d => t(`createJob.weekdays.${d}`))
                        .join(', ')
                    : t('businessJobDetails.anyDay')}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.date')}</Text>
                <Text style={styles.detailValue}>
                  {formatDate(job.shiftDetails.startDate)}
                  {job.shiftDetails.endDate && ` - ${formatDate(job.shiftDetails.endDate)}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.time')}</Text>
                <Text style={styles.detailValue}>
                  {job.shiftDetails.startTime} - {job.shiftDetails.endTime}
                </Text>
              </View>
              {job.shiftDetails.isRecurring && job.shiftDetails.recurringDays && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('businessJobDetails.recurring')}</Text>
                  <Text style={styles.detailValue}>
                    {formatRecurringDays(job.shiftDetails.recurringDays)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Compensation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('businessJobDetails.compensation')}</Text>
          <Text style={styles.compensationAmount}>
            {job.compensation.amount.toLocaleString('ru-RU')} ₽
          </Text>
          <Text style={styles.compensationType}>
            {job.compensation.type === 'hourly'
              ? t('businessJobDetails.perHour')
              : job.compensation.type === 'daily'
                ? t('businessJobDetails.perDay')
                : t('businessJobDetails.fixed')}
          </Text>
          {SHOW_PLATFORM_FEE && job.payment && (
            <View style={styles.paymentDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.platformFee')}</Text>
                <Text style={styles.detailValue}>
                  {job.payment.platformFee.toLocaleString('ru-RU')} ₽
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('businessJobDetails.totalCost')}</Text>
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
            <Text style={styles.sectionTitle}>{t('businessJobDetails.description')}</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('businessJobDetails.requirements')}</Text>
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
            <Text style={styles.sectionTitle}>{t('businessJobDetails.requiredEquipment')}</Text>
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
            <Text style={styles.detailLabel}>{t('businessJobDetails.jobType')}</Text>
            <Text style={styles.detailValue}>
              {job.jobType === 'temporary'
                ? t('businessJobDetails.jobTypeTemporary')
                : t('businessJobDetails.jobTypePermanent')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('businessJobDetails.status')}</Text>
            <Text style={styles.detailValue}>
              {t(`business.jobs.status.${job.status}`, { defaultValue: job.status })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('businessJobDetails.posted')}</Text>
            <Text style={styles.detailValue}>{formatDate(job.postedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      {showFooter && (
        <View style={styles.footer}>
          {canViewApplicants && (
            <TouchableOpacity style={styles.viewApplicantsButton} onPress={handleViewApplicants}>
              <Text style={styles.viewApplicantsButtonText}>
                {hasApplicants
                  ? t('businessJobDetails.viewApplicants', { count: job.applicationCount })
                  : t('businessJobDetails.viewPendingOffers', { count: pendingOfferCount })}
              </Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineAction]}
              onPress={handleEdit}
              disabled={isUpdatingStatus}>
              <Text style={styles.outlineActionText}>{t('job.actions.edit')}</Text>
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

      <FullscreenImageViewer
        visible={viewerVisible}
        photos={job.branchPhotos ?? []}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
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
    borderRadius: 12,
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
    borderRadius: 999,
    alignItems: 'center',
  },
  viewApplicantsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 999,
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
