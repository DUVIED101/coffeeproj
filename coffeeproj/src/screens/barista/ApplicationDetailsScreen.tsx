import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { ShiftCountdownBanner } from '../../components/ShiftCountdownBanner';
import { useStaleCallback } from '../../hooks/useStaleCallback';
import { showErrorToast, showSuccessToast } from '../../stores/errorToastStore';
import { handleApiError } from '../../utils/handleApiError';
import { ApplicationService } from '../../services/ApplicationService';
import { ReviewService } from '../../services/ReviewService';
import { ReviewModal } from '../../components/ReviewModal';
import { getShiftEnd, canBaristaCancelShift, getShiftStart } from '../../utils/shiftLifecycle';
import type { Application, DisputeSummary } from '../../types/application';
import type { ApplicationId, UserId } from '../../types/ids';
import type { ApplicationReview } from '../../types/review';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Applications: undefined;
  ApplicationDetails: { application: Application } | { applicationId: string };
  DisputeForm: { applicationId: string; role: 'barista' | 'business' };
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'ApplicationDetails'>;
  route: RouteProp<BaristaStackParamList, 'ApplicationDetails'>;
};

export const ApplicationDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const params = route.params;
  const initialApp = 'application' in params ? params.application : undefined;
  const idParam = 'applicationId' in params ? (params.applicationId as ApplicationId) : undefined;

  const [application, setApplication] = useState<Application | undefined>(initialApp);
  const [isLoadingApp, setIsLoadingApp] = useState(initialApp === undefined);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isCancellingShift, setIsCancellingShift] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(initialApp?.status ?? 'pending');
  const [completedByBarista, setCompletedByBarista] = useState(
    initialApp?.completedByBarista ?? false
  );
  const [completedByBusiness, setCompletedByBusiness] = useState(
    initialApp?.completedByBusiness ?? false
  );
  const [existingReview, setExistingReview] = useState<ApplicationReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [shiftConfirmationStatus, setShiftConfirmationStatus] = useState(
    initialApp?.shiftConfirmationStatus
  );
  const [disputeSummary, setDisputeSummary] = useState<DisputeSummary | null>(null);
  const hasPromptedThisSession = useRef(false);

  // Stable id captured once from route params — used by refresh on focus and
  // foreground so the latest shift_confirmation_status is pulled even when the
  // screen instance is reused (notification re-tap, app resumed from background).
  const persistentApplicationId = useMemo<ApplicationId | undefined>(
    () => (initialApp?.id ?? idParam) as ApplicationId | undefined,
    [initialApp, idParam]
  );

  const refreshApplication = useCallback(
    async (showSpinner: boolean): Promise<void> => {
      if (!persistentApplicationId) return;
      if (showSpinner) setIsLoadingApp(true);
      try {
        const app = await ApplicationService.getApplicationById(persistentApplicationId);
        if (!app) return;
        setApplication(app);
        setCurrentStatus(app.status);
        setCompletedByBarista(app.completedByBarista);
        setCompletedByBusiness(app.completedByBusiness);
        setShiftConfirmationStatus(app.shiftConfirmationStatus);
      } catch (err) {
        console.error('Error refreshing application:', err);
      } finally {
        if (showSpinner) setIsLoadingApp(false);
      }
    },
    [persistentApplicationId]
  );

  // Coalesce focus + AppState refreshes so rapid foreground/focus events don't
  // fire the same fetch twice within a short window.
  const refreshIfStale = useStaleCallback(() => {
    void refreshApplication(false);
  }, 30_000);

  useFocusEffect(
    useCallback(() => {
      if (application === undefined) {
        // First mount — always fetch with the spinner so the screen has data.
        void refreshApplication(true);
        refreshIfStale.reset();
      } else {
        refreshIfStale();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshApplication, refreshIfStale])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshIfStale();
    });
    return () => sub.remove();
  }, [refreshIfStale]);

  const job = application?.job;
  const businessOwnerId = job?.businessOwnerId as UserId | undefined;
  const applicationId = (application?.id ?? idParam) as ApplicationId;

  const shiftEnd = useMemo(
    () => (job?.shiftDetails ? getShiftEnd(job.shiftDetails) : null),
    [job?.shiftDetails]
  );
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!shiftEnd) return;
    const msUntilEnd = shiftEnd.getTime() - Date.now();
    if (msUntilEnd <= 0) return;
    const timeoutId = setTimeout(() => setNow(new Date()), msUntilEnd + 1000);
    return () => clearTimeout(timeoutId);
  }, [shiftEnd]);

  const cancelWindowClose = useMemo(
    () =>
      job?.shiftDetails
        ? new Date(getShiftStart(job.shiftDetails).getTime() + 60 * 60 * 1000)
        : null,
    [job?.shiftDetails]
  );

  useEffect(() => {
    if (!cancelWindowClose) return;
    const msUntilClose = cancelWindowClose.getTime() - Date.now();
    if (msUntilClose <= 0) return;
    const timeoutId = setTimeout(() => setNow(new Date()), msUntilClose + 1000);
    return () => clearTimeout(timeoutId);
  }, [cancelWindowClose]);

  useEffect(() => {
    let cancelled = false;
    const checkReview = async () => {
      if (currentStatus !== 'completed') return;
      try {
        const review = await ReviewService.getReviewByApplication(applicationId, 'barista');
        if (!cancelled) setExistingReview(review);
      } catch (error) {
        console.error('Error loading existing review:', error);
      }
    };
    checkReview();
    return () => {
      cancelled = true;
    };
  }, [currentStatus, applicationId]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const fetchDispute = async () => {
        if (currentStatus !== 'accepted' && currentStatus !== 'completed') return;
        try {
          const d = await ApplicationService.getOwnDispute(applicationId);
          if (!cancelled) setDisputeSummary(d);
        } catch {
          // non-critical
        }
      };
      fetchDispute();
      return () => {
        cancelled = true;
      };
    }, [applicationId, currentStatus])
  );

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
        return t('applications.status.pending');
      case 'under_review':
        return t('applications.status.underReview');
      case 'accepted':
        return t('applications.status.accepted');
      case 'rejected':
        return t('applications.status.rejected');
      case 'withdrawn':
        return t('applications.status.withdrawn');
      case 'completed':
        return t('applications.status.completed');
      default:
        return status;
    }
  };

  const handleWithdraw = () => {
    Alert.alert(
      t('applications.details.withdrawConfirmTitle'),
      t('applications.details.withdrawConfirmBody'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('applications.details.withdrawAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsWithdrawing(true);
              await ApplicationService.withdrawApplication(application!.id);
              setCurrentStatus('withdrawn');
              showSuccessToast(t('applications.details.withdrawSuccess'));
              navigation.goBack();
            } catch (error) {
              console.error('Error withdrawing application:', error);
              void handleApiError(error);
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelShift = () => {
    const bodyKey =
      shiftConfirmationStatus === 'pending'
        ? 'applications.cancelShift.confirmBodyAfterRequest'
        : 'applications.cancelShift.confirmBody';
    Alert.alert(t('applications.cancelShift.confirmTitle'), t(bodyKey), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('applications.cancelShift.action'),
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCancellingShift(true);
            await ApplicationService.withdrawApplication(application!.id);
            setCurrentStatus('withdrawn');
            showSuccessToast(t('applications.cancelShift.success'));
            navigation.goBack();
          } catch (error) {
            console.error('Error cancelling shift:', error);
            void handleApiError(error);
          } finally {
            setIsCancellingShift(false);
          }
        },
      },
    ]);
  };

  const handleMarkComplete = async () => {
    try {
      setIsMarkingComplete(true);
      await ApplicationService.markCompletedByBarista(application!.id);
      setCompletedByBarista(true);

      const refreshed = await ApplicationService.checkApplicationExists(
        application!.jobId,
        application!.baristaId
      );
      if (refreshed) {
        setCurrentStatus(refreshed.status);
        setCompletedByBusiness(refreshed.completedByBusiness);
      }
      const bothCompleted = refreshed?.status === 'completed';
      if (bothCompleted && !hasPromptedThisSession.current && !existingReview && businessOwnerId) {
        hasPromptedThisSession.current = true;
        setShowReviewModal(true);
      } else {
        showSuccessToast(t('applications.details.markCompleteSuccess'));
      }
    } catch (error) {
      console.error('Error marking work complete:', error);
      void handleApiError(error);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const showReviewBanner =
    currentStatus === 'completed' && !existingReview && !showReviewModal && !!businessOwnerId;

  const formatJobDate = (iso: string): string => {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatRecurringDays = (days: string[]): string => {
    const dayMap: Record<string, string> =
      locale === 'ru-RU'
        ? {
            monday: 'Пн',
            tuesday: 'Вт',
            wednesday: 'Ср',
            thursday: 'Чт',
            friday: 'Пт',
            saturday: 'Сб',
            sunday: 'Вс',
          }
        : {
            monday: 'Mon',
            tuesday: 'Tue',
            wednesday: 'Wed',
            thursday: 'Thu',
            friday: 'Fri',
            saturday: 'Sat',
            sunday: 'Sun',
          };
    return days.map(d => dayMap[d] ?? d).join(', ');
  };

  const canWithdraw = currentStatus === 'pending' || currentStatus === 'under_review';
  const shiftEndReached = !shiftEnd || now.getTime() >= shiftEnd.getTime();
  const canMarkComplete = currentStatus === 'accepted' && !completedByBarista && shiftEndReached;
  const showMarkCompleteSection = currentStatus === 'accepted' && !completedByBarista;
  const isWaitingForShiftEnd = showMarkCompleteSection && !shiftEndReached;
  const shiftEndLabel = shiftEnd
    ? shiftEnd.toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const canCancelShift = job?.shiftDetails
    ? canBaristaCancelShift(
        { status: currentStatus, shiftConfirmationStatus },
        job.shiftDetails,
        now
      )
    : currentStatus === 'accepted';
  const showCompletionStatus = currentStatus === 'accepted' || currentStatus === 'completed';

  if (isLoadingApp || !application) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={{ flex: 1 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const shiftStartDate =
    currentStatus === 'accepted' && job?.shiftDetails && job.shiftDetails.kind === 'temporary'
      ? getShiftStart(job.shiftDetails)
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {shiftStartDate && job?.title ? (
          <ShiftCountdownBanner shiftStart={shiftStartDate} jobTitle={job.title} />
        ) : null}
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>{t('applications.details.applicationStatus')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(currentStatus)}</Text>
          </View>
          <Text style={styles.appliedDate}>
            {t('applications.details.appliedOn', {
              date: new Date(application.createdAt).toLocaleDateString(locale),
            })}
          </Text>
        </View>

        {/* Job Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('applications.details.jobDetails')}</Text>
          <Text style={styles.jobTitle}>{job?.title || ''}</Text>
          <Text style={styles.businessName}>{job?.businessName || ''}</Text>
          {job?.branchName && <Text style={styles.branchName}>{job.branchName}</Text>}
        </View>

        {/* Location */}
        {(job?.location?.address || job?.metroStation) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.location')}</Text>
            {job?.location?.address && <Text style={styles.address}>{job.location.address}</Text>}
            {job?.metroStation && (
              <Text style={styles.metroStation}>
                {t('applications.details.metroPrefix', { station: job.metroStation })}
              </Text>
            )}
          </View>
        )}

        {/* Shift Details */}
        {job?.shiftDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.shiftDetails')}</Text>
            {job.shiftDetails.kind === 'permanent' ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('applications.details.shiftStartDatePermanent')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatJobDate(job.shiftDetails.startDate)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('applications.details.shiftHoursPerWeek')}
                  </Text>
                  <Text style={styles.detailValue}>{job.shiftDetails.hoursPerWeek}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('applications.details.shiftPreferredDays')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {job.shiftDetails.preferredDays && job.shiftDetails.preferredDays.length > 0
                      ? job.shiftDetails.preferredDays
                          .map(d => t(`createJob.weekdays.${d}`))
                          .join(', ')
                      : t('applications.details.shiftAnyDay')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('applications.details.shiftDate')}</Text>
                  <Text style={styles.detailValue}>
                    {formatJobDate(job.shiftDetails.startDate)}
                  </Text>
                </View>
                {job.shiftDetails.endDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('applications.details.shiftEndDate')}</Text>
                    <Text style={styles.detailValue}>
                      {formatJobDate(job.shiftDetails.endDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('applications.details.shiftTime')}</Text>
                  <Text style={styles.detailValue}>
                    {job.shiftDetails.startTime} – {job.shiftDetails.endTime}
                  </Text>
                </View>
                {job.shiftDetails.isRecurring && job.shiftDetails.recurringDays && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('applications.details.shiftRecurring')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatRecurringDays(job.shiftDetails.recurringDays)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Compensation */}
        {job?.compensation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.compensation')}</Text>
            <Text style={styles.compensation}>
              {job.compensation.amount.toLocaleString(locale)} ₽{' · '}
              {job.compensation.type === 'hourly'
                ? t('applications.details.perHour')
                : job.compensation.type === 'daily'
                  ? t('applications.details.perDay')
                  : t('applications.details.fixed')}
            </Text>
          </View>
        )}

        {/* Equipment */}
        {job?.requiredEquipmentExperience && job.requiredEquipmentExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.equipment')}</Text>
            {job.requiredEquipmentExperience.map((eq, idx) => (
              <Text key={idx} style={styles.requirementItem}>
                • {eq}
              </Text>
            ))}
          </View>
        )}

        {/* Description */}
        {job?.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.description')}</Text>
            <Text style={styles.coverLetter}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
        {job?.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.requirements')}</Text>
            {job.requirements.map((req, idx) => (
              <Text key={idx} style={styles.requirementItem}>
                • {req}
              </Text>
            ))}
          </View>
        )}

        {/* Meta (job type, posted date) */}
        {job && (
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('applications.details.jobType')}</Text>
              <Text style={styles.detailValue}>
                {job.jobType === 'temporary'
                  ? t('applications.details.jobTypeTemporary')
                  : t('applications.details.jobTypePermanent')}
              </Text>
            </View>
            {job.postedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('applications.details.postedOn')}</Text>
                <Text style={styles.detailValue}>{formatJobDate(job.postedAt)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.yourCoverLetter')}</Text>
            <Text style={styles.coverLetter}>{application.coverLetter}</Text>
          </View>
        )}

        {showReviewBanner && (
          <TouchableOpacity
            style={styles.reviewBanner}
            onPress={() => setShowReviewModal(true)}
            accessibilityRole="button">
            <Text style={styles.reviewBannerText}>{t('reviews.banner.prompt')}</Text>
          </TouchableOpacity>
        )}

        {/* Work Completion Status */}
        {showCompletionStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('applications.details.workCompletion')}</Text>
            {completedByBarista && completedByBusiness && (
              <View style={styles.completionBanner}>
                <Text style={styles.completionText}>{t('applications.details.completedBoth')}</Text>
              </View>
            )}
            {completedByBarista && !completedByBusiness && (
              <View style={[styles.completionBanner, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.completionText, { color: '#92400E' }]}>
                  {t('applications.details.completedAwaitingBusiness')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {businessOwnerId && (
        <ReviewModal
          visible={showReviewModal}
          applicationId={applicationId}
          raterRole="barista"
          rateeId={businessOwnerId}
          onSubmitted={review => {
            setExistingReview(review);
            setShowReviewModal(false);
          }}
          onSkip={() => setShowReviewModal(false)}
        />
      )}

      {/* Action Buttons */}
      {(canWithdraw ||
        showMarkCompleteSection ||
        canCancelShift ||
        currentStatus === 'completed') && (
        <View style={styles.footer}>
          {showMarkCompleteSection && (
            <>
              <TouchableOpacity
                style={[styles.completeButton, !canMarkComplete && styles.completeButtonDisabled]}
                onPress={handleMarkComplete}
                disabled={isMarkingComplete || !canMarkComplete}>
                {isMarkingComplete ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.completeButtonText}>
                    {t('applications.details.markCompleteAction')}
                  </Text>
                )}
              </TouchableOpacity>
              {isWaitingForShiftEnd && (
                <Text style={styles.availableAfterText}>
                  {t('applications.details.availableAfter', {
                    time: shiftEndLabel,
                    defaultValue: 'Available after {{time}}',
                  })}
                </Text>
              )}
            </>
          )}
          {shiftConfirmationStatus === 'confirmed' && currentStatus === 'accepted' && (
            <Text style={styles.cancelLockedHint}>{t('shifts.confirmation.cancelLockedHint')}</Text>
          )}
          {canCancelShift && (
            <TouchableOpacity
              style={[styles.cancelShiftButton, showMarkCompleteSection && { marginTop: 12 }]}
              onPress={handleCancelShift}
              disabled={isCancellingShift}>
              {isCancellingShift ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.cancelShiftButtonText}>
                  {t('applications.cancelShift.action')}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {canWithdraw && (
            <TouchableOpacity
              style={[styles.withdrawButton, canMarkComplete && { marginTop: 12 }]}
              onPress={handleWithdraw}
              disabled={isWithdrawing}>
              {isWithdrawing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.withdrawButtonText}>
                  {t('applications.details.withdrawAction')}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {(currentStatus === 'completed' || currentStatus === 'accepted') &&
            (disputeSummary ? (
              <View style={styles.disputeStatusBox}>
                <Text style={styles.disputeStatusLabel}>{t('disputes.filedLabel')}</Text>
                <Text style={styles.disputeStatusValue}>
                  {t(`disputes.status.${disputeSummary.status}`)}
                </Text>
                {disputeSummary.resolutionNote ? (
                  <Text style={styles.disputeResolutionNote}>
                    {t('disputes.resolutionNote')} {disputeSummary.resolutionNote}
                  </Text>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.disputeButton}
                onPress={() =>
                  navigation.navigate('DisputeForm', {
                    applicationId: application.id,
                    role: 'barista',
                  })
                }
                accessibilityLabel={t('disputes.openAction')}>
                <Text style={styles.disputeButtonText}>{t('disputes.openAction')}</Text>
              </TouchableOpacity>
            ))}
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
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedDate: {
    fontSize: 14,
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
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metroStation: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  compensation: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 12,
  },
  coverLetter: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  requirementItem: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  address: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  withdrawButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  availableAfterText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cancelLockedHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  cancelShiftButton: {
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  cancelShiftButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  disputeButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
  },
  disputeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  disputeStatusBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  disputeStatusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  disputeStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  disputeResolutionNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  completionBanner: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  reviewBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FCD34D',
  },
  reviewBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
});
