import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect, type RouteProp } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import { transformedImageUrl } from '../../utils/imageTransform';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import { ChatService } from '../../services/ChatService';
import { JobService } from '../../services/JobService';
import { JobOfferService } from '../../services/JobOfferService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { ReviewModal } from '../../components/ReviewModal';
import { ShiftCountdownBanner } from '../../components/ShiftCountdownBanner';
import { Skeleton } from '../../components/Skeleton';
import { getShiftEnd, getShiftStart, canCancelShiftNow } from '../../utils/shiftLifecycle';
import type { Application, ApplicationStatus, DisputeSummary } from '../../types/application';
import type { JobOffer } from '../../types/jobOffer';
import type { ShiftDetails } from '../../types/job';
import type { ApplicationId, JobId, UserId } from '../../types/ids';
import type { ApplicationReview } from '../../types/review';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import type { TFunction } from 'i18next';
import { showErrorToast, showSuccessToast } from '../../stores/errorToastStore';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'Applicants'>;
  route: RouteProp<BusinessStackParamList, 'Applicants'>;
};

const getStatusColor = (status: ApplicationStatus): string => {
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

const getStatusText = (status: ApplicationStatus, t: TFunction): string => {
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

interface ApplicantItemProps {
  application: Application;
  applicationId: string;
  baristaId: string;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onCancelShift: (applicationId: string) => void;
  onViewProfile: (baristaId: string) => void;
  onChatPress: (applicationId: string) => void;
  onConfirmCompletion: (applicationId: string) => void;
  onOpenReview: (application: Application) => void;
  onFileDispute: (applicationId: string) => void;
  onOpenDispute: (disputeId: string) => void;
  isProcessing: boolean;
  unreadCount: number;
  needsReview: boolean;
  reviewBannerLabel: string;
  cancelLabel: string;
  fileDisputeLabel: string;
  disputeSummary: DisputeSummary | null;
  shiftEndReached: boolean;
  shiftWaitingLabel: string;
  cancelWindowOpen: boolean;
  t: TFunction;
}

const ApplicantItem = React.memo<ApplicantItemProps>(
  ({
    application,
    applicationId,
    baristaId,
    onAccept,
    onReject,
    onCancelShift,
    onViewProfile,
    onChatPress,
    onConfirmCompletion,
    onOpenReview,
    onFileDispute,
    onOpenDispute,
    isProcessing,
    unreadCount,
    needsReview,
    reviewBannerLabel,
    cancelLabel,
    fileDisputeLabel,
    disputeSummary,
    shiftEndReached,
    shiftWaitingLabel,
    cancelWindowOpen,
    t,
  }) => {
    const handleAccept = useCallback(() => onAccept(applicationId), [onAccept, applicationId]);
    const handleReject = useCallback(() => onReject(applicationId), [onReject, applicationId]);
    const handleCancelShift = useCallback(
      () => onCancelShift(applicationId),
      [onCancelShift, applicationId]
    );
    const handleViewProfile = useCallback(
      () => onViewProfile(baristaId),
      [onViewProfile, baristaId]
    );
    const handleChatPress = useCallback(
      () => onChatPress(applicationId),
      [onChatPress, applicationId]
    );
    const handleConfirmCompletion = useCallback(
      () => onConfirmCompletion(applicationId),
      [onConfirmCompletion, applicationId]
    );
    const handleOpenReview = useCallback(
      () => onOpenReview(application),
      [onOpenReview, application]
    );
    const handleFileDispute = useCallback(
      () => onFileDispute(applicationId),
      [onFileDispute, applicationId]
    );
    const handleOpenDispute = useCallback(
      () => disputeSummary && onOpenDispute(disputeSummary.id),
      [onOpenDispute, disputeSummary]
    );
    const baristaProfile = application.baristaProfile;
    const baristaEmail = application.baristaEmail || t('applicants.noEmail');

    // Get display name - prefer firstName+lastName if both exist and are non-empty
    let displayName = baristaEmail;
    if (baristaProfile?.firstName?.trim() && baristaProfile?.lastName?.trim()) {
      displayName = `${baristaProfile.firstName.trim()} ${baristaProfile.lastName.trim()}`;
    } else if (baristaProfile?.firstName?.trim()) {
      displayName = baristaProfile.firstName.trim();
    } else if (baristaProfile?.lastName?.trim()) {
      displayName = baristaProfile.lastName.trim();
    }

    const statusColor = getStatusColor(application.status);
    const statusText = getStatusText(application.status, t);
    const isActionable = application.status === 'pending' || application.status === 'under_review';
    const showConfirmCompletionSection =
      application.status === 'accepted' && !application.completedByBusiness;
    const canConfirmCompletion = showConfirmCompletionSection && shiftEndReached;
    const isWaitingForShiftEnd = showConfirmCompletionSection && !shiftEndReached;
    const canCancelShift = application.status === 'accepted' && cancelWindowOpen;

    return (
      <View style={styles.applicantCard}>
        <View style={styles.applicantHeader}>
          <View style={styles.applicantHeaderLeft}>
            {baristaProfile?.avatarUrl ? (
              <FastImage
                source={{ uri: transformedImageUrl(baristaProfile.avatarUrl, 48) }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.applicantInfo}>
              <Text style={styles.baristaName}>{displayName}</Text>
              {baristaProfile && baristaProfile.yearsOfExperience !== undefined && (
                <Text style={styles.experienceText}>
                  {t('applicants.experienceYears', { count: baristaProfile.yearsOfExperience })}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {application.coverLetter && (
          <View style={styles.coverLetterContainer}>
            <Text style={styles.coverLetterLabel}>{t('applicants.coverLetterLabel')}</Text>
            <Text style={styles.coverLetterText}>{application.coverLetter}</Text>
          </View>
        )}

        <Text style={styles.appliedDate}>
          {t('applicants.appliedOn', {
            date: new Date(application.createdAt).toLocaleDateString('ru-RU'),
          })}
        </Text>

        <TouchableOpacity style={styles.viewProfileButton} onPress={handleViewProfile}>
          <Text style={styles.viewProfileButtonText}>{t('applicants.viewProfile')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>{t('applicants.chat')}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {showConfirmCompletionSection && (
          <>
            <TouchableOpacity
              style={[
                styles.confirmCompletionButton,
                !canConfirmCompletion && styles.confirmCompletionButtonDisabled,
              ]}
              onPress={handleConfirmCompletion}
              disabled={isProcessing || !canConfirmCompletion}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmCompletionButtonText}>
                  {t('applicants.confirmCompletion')}
                </Text>
              )}
            </TouchableOpacity>
            {isWaitingForShiftEnd && (
              <Text style={styles.shiftWaitingText}>{shiftWaitingLabel}</Text>
            )}
          </>
        )}

        {canCancelShift && (
          <TouchableOpacity
            style={styles.cancelShiftButton}
            onPress={handleCancelShift}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.cancelShiftButtonText}>{cancelLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {needsReview && (
          <TouchableOpacity
            style={styles.reviewBanner}
            onPress={handleOpenReview}
            accessibilityRole="button">
            <Text style={styles.reviewBannerText}>{reviewBannerLabel}</Text>
          </TouchableOpacity>
        )}

        {(application.status === 'completed' || application.status === 'accepted') &&
          (disputeSummary ? (
            <TouchableOpacity
              style={styles.disputeStatusBox}
              onPress={handleOpenDispute}
              accessibilityRole="button"
              accessibilityLabel={t('disputes.openDetails', { defaultValue: 'Открыть жалобу' })}
              activeOpacity={0.7}>
              <Text style={styles.disputeStatusLabel}>{t('disputes.filedLabel')}</Text>
              <Text style={styles.disputeStatusValue}>
                {t(`disputes.status.${disputeSummary.status}`)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.disputeButton}
              onPress={handleFileDispute}
              accessibilityLabel={fileDisputeLabel}>
              <Text style={styles.disputeButtonText}>{fileDisputeLabel}</Text>
            </TouchableOpacity>
          ))}

        {isActionable && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>{t('applicants.accept')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>{t('applicants.reject')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);

export const ApplicantsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId } = route.params;
  const user = useAuthStore(s => s.user);

  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pendingOffers, setPendingOffers] = useState<JobOffer[]>([]);
  const [cancellingOfferIds, setCancellingOfferIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: ApplicationId;
    rateeId: UserId;
  } | null>(null);
  const [shiftDetails, setShiftDetails] = useState<ShiftDetails | null>(null);
  const [jobTitle, setJobTitle] = useState<string>('');
  const [now, setNow] = useState<Date>(() => new Date());
  const [ownDisputeMap, setOwnDisputeMap] = useState<Record<string, DisputeSummary>>({});
  const promptedAppIds = useRef<Set<string>>(new Set());

  const shiftEnd = useMemo(() => (shiftDetails ? getShiftEnd(shiftDetails) : null), [shiftDetails]);
  const cancelWindowClose = useMemo(
    () => (shiftDetails ? new Date(getShiftStart(shiftDetails).getTime() + 60 * 60 * 1000) : null),
    [shiftDetails]
  );
  const cancelWindowOpen = shiftDetails ? canCancelShiftNow(shiftDetails, now) : true;

  useEffect(() => {
    let cancelled = false;
    const loadJob = async () => {
      try {
        const job = await JobService.getJobById(jobId);
        if (!cancelled) {
          setShiftDetails(job.shiftDetails);
          setJobTitle(job.title);
        }
      } catch (error) {
        console.error('Error loading job for shift gating:', error);
      }
    };
    loadJob();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (applications.length === 0) return;
    const ids = applications.map(a => a.id as ApplicationId);
    ApplicationService.getOwnDisputeMap(ids)
      .then(setOwnDisputeMap)
      .catch(() => {});
  }, [applications]);

  useEffect(() => {
    if (!shiftEnd) return;
    const msUntilEnd = shiftEnd.getTime() - Date.now();
    if (msUntilEnd <= 0) return;
    const timeoutId = setTimeout(() => setNow(new Date()), msUntilEnd + 1000);
    return () => clearTimeout(timeoutId);
  }, [shiftEnd]);

  useEffect(() => {
    if (!cancelWindowClose) return;
    const msUntilClose = cancelWindowClose.getTime() - Date.now();
    if (msUntilClose <= 0) return;
    const timeoutId = setTimeout(() => setNow(new Date()), msUntilClose + 1000);
    return () => clearTimeout(timeoutId);
  }, [cancelWindowClose]);

  const shiftEndReached = !shiftEnd || now.getTime() >= shiftEnd.getTime();
  const shiftEndLabel = shiftEnd
    ? shiftEnd.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const markProcessing = useCallback((id: string, on: boolean) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const loadApplicants = useCallback(async () => {
    try {
      setIsLoading(true);
      const [data, offers] = await Promise.all([
        ApplicationService.getApplicationsByJob(jobId),
        JobOfferService.getPendingOffersForJob(jobId as JobId).catch(err => {
          console.error('Error loading pending offers:', err);
          return [] as JobOffer[];
        }),
      ]);
      setApplications(data);
      setPendingOffers(offers);

      const ids = data.map(a => a.id);
      try {
        const counts = await ChatService.getUnreadCountsByApplicationIds(ids, 'business');
        setUnreadCounts(counts);
      } catch (err) {
        console.error('Error fetching unread counts:', err);
        setUnreadCounts({});
      }

      const completedIds = data.filter(a => a.status === 'completed').map(a => a.id);
      if (completedIds.length > 0) {
        try {
          const reviewedSet = new Set<string>();
          await Promise.all(
            completedIds.map(async id => {
              const review = await ReviewService.getReviewByApplication(
                id as ApplicationId,
                'business'
              );
              if (review) reviewedSet.add(id);
            })
          );
          setReviewedIds(reviewedSet);
        } catch (err) {
          console.error('Error fetching review state:', err);
        }
      }
    } catch (error) {
      console.error('Error loading applicants:', error);
      showErrorToast(t('applicants.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId, t]);

  useFocusEffect(
    useCallback(() => {
      loadApplicants();
    }, [loadApplicants])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadApplicants();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadApplicants]);

  const handleAccept = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.updateApplicationStatus(applicationId, 'accepted', user.id);
        await loadApplicants();
        showSuccessToast(t('applicants.acceptSuccess'));
      } catch (error) {
        console.error('Error accepting application:', error);
        showErrorToast(t('applicants.acceptFailure'));
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants, t]
  );

  const handleReject = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.updateApplicationStatus(applicationId, 'rejected', user.id);
        await loadApplicants();
        showSuccessToast(t('applicants.rejectSuccess'));
      } catch (error) {
        console.error('Error rejecting application:', error);
        showErrorToast(t('applicants.rejectFailure'));
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants, t]
  );

  const handleCancelShift = useCallback(
    (applicationId: string) => {
      if (!user) return;
      Alert.alert(
        t('applications.cancelShift.confirmTitle'),
        t('applications.cancelShift.confirmBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('applications.cancelShift.action'),
            style: 'destructive',
            onPress: async () => {
              try {
                markProcessing(applicationId, true);
                await ApplicationService.updateApplicationStatus(
                  applicationId,
                  'rejected',
                  user.id
                );
                await loadApplicants();
                showSuccessToast(t('applications.cancelShift.success'));
              } catch (error) {
                console.error('Error cancelling shift:', error);
                showErrorToast(t('applications.cancelShift.failure'));
              } finally {
                markProcessing(applicationId, false);
              }
            },
          },
        ]
      );
    },
    [user, markProcessing, loadApplicants, t]
  );

  const handleViewProfile = useCallback(
    (baristaId: string) => {
      navigation.navigate('ViewBaristaProfile', { baristaId });
    },
    [navigation]
  );

  const handleChatPress = useCallback(
    (applicationId: string) => {
      navigation.getParent()?.navigate('Chats', {
        screen: 'Chat',
        initial: false,
        params: { applicationId },
      });
    },
    [navigation]
  );

  const handleConfirmCompletion = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.markCompletedByBusiness(applicationId, user.id);
        await loadApplicants();
        const refreshedList = await ApplicationService.getApplicationsByJob(jobId);
        const refreshed = refreshedList.find(a => a.id === applicationId);
        if (
          refreshed &&
          refreshed.status === 'completed' &&
          !promptedAppIds.current.has(applicationId)
        ) {
          promptedAppIds.current.add(applicationId);
          const existing = await ReviewService.getReviewByApplication(
            applicationId as ApplicationId,
            'business'
          );
          if (!existing) {
            setReviewTarget({
              applicationId: applicationId as ApplicationId,
              rateeId: refreshed.baristaId as UserId,
            });
          }
        }
        showSuccessToast(t('applicants.confirmCompletionSuccess'));
      } catch (error) {
        console.error('Error confirming completion:', error);
        showErrorToast(t('applicants.confirmCompletionFailure'));
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants, jobId, t]
  );

  const handleOpenReview = useCallback((application: Application) => {
    setReviewTarget({
      applicationId: application.id as ApplicationId,
      rateeId: application.baristaId as UserId,
    });
  }, []);

  const handleFileDispute = useCallback(
    (applicationId: string) => {
      navigation.navigate('DisputeForm', { applicationId, role: 'business' });
    },
    [navigation]
  );

  const handleOpenDispute = useCallback(
    (disputeId: string) => {
      navigation.navigate('DisputeDetails', { disputeId });
    },
    [navigation]
  );

  const handleCancelOffer = useCallback(
    async (offer: JobOffer) => {
      Alert.alert(t('applicants.cancelOfferConfirmTitle'), t('applicants.cancelOfferConfirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('applicants.cancelOffer'),
          style: 'destructive',
          onPress: async () => {
            setCancellingOfferIds(prev => new Set(prev).add(offer.id));
            try {
              await JobOfferService.cancelOffer(offer.id);
              setPendingOffers(prev => prev.filter(o => o.id !== offer.id));
            } catch (error) {
              console.error('Error cancelling offer:', error);
              showErrorToast(t('applicants.cancelOfferFailure'));
            } finally {
              setCancellingOfferIds(prev => {
                const next = new Set(prev);
                next.delete(offer.id);
                return next;
              });
            }
          },
        },
      ]);
    },
    [t]
  );

  const handleReviewSubmitted = useCallback((review: ApplicationReview) => {
    setReviewedIds(prev => new Set(prev).add(review.applicationId));
    setReviewTarget(null);
  }, []);

  const reviewBannerLabel = t('reviews.banner.prompt');
  const cancelLabel = t('applications.cancelShift.action');
  const fileDisputeLabel = t('disputes.openAction');
  const shiftWaitingLabel = shiftEndLabel
    ? t('applications.details.availableAfter', {
        time: shiftEndLabel,
        defaultValue: 'Доступно с {{time}}',
      })
    : '';

  const renderApplicant = useCallback(
    ({ item }: { item: Application }) => (
      <ApplicantItem
        application={item}
        applicationId={item.id}
        baristaId={item.baristaId}
        onAccept={handleAccept}
        onReject={handleReject}
        onCancelShift={handleCancelShift}
        onViewProfile={handleViewProfile}
        onChatPress={handleChatPress}
        onConfirmCompletion={handleConfirmCompletion}
        onOpenReview={handleOpenReview}
        onFileDispute={handleFileDispute}
        onOpenDispute={handleOpenDispute}
        isProcessing={processingIds.has(item.id)}
        unreadCount={unreadCounts[item.id] || 0}
        needsReview={item.status === 'completed' && !reviewedIds.has(item.id)}
        reviewBannerLabel={reviewBannerLabel}
        cancelLabel={cancelLabel}
        fileDisputeLabel={fileDisputeLabel}
        disputeSummary={ownDisputeMap[item.id] ?? null}
        shiftEndReached={shiftEndReached}
        shiftWaitingLabel={shiftWaitingLabel}
        cancelWindowOpen={cancelWindowOpen}
        t={t}
      />
    ),
    [
      handleAccept,
      handleReject,
      handleCancelShift,
      handleViewProfile,
      handleChatPress,
      handleConfirmCompletion,
      handleOpenReview,
      handleFileDispute,
      handleOpenDispute,
      processingIds,
      unreadCounts,
      reviewedIds,
      reviewBannerLabel,
      cancelLabel,
      fileDisputeLabel,
      ownDisputeMap,
      shiftEndReached,
      shiftWaitingLabel,
      cancelWindowOpen,
      t,
    ]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('applicants.empty')}</Text>
      <Text style={styles.emptySubtext}>{t('applicants.emptySubtitle')}</Text>
    </View>
  );

  // Banner is anchored to the accepted application; for temporary shifts only,
  // since permanent jobs don't have a single start-of-shift moment.
  const acceptedApplication = applications.find(a => a.status === 'accepted');
  const shiftStartDate =
    shiftDetails && shiftDetails.kind === 'temporary' ? getShiftStart(shiftDetails) : null;
  const showCountdownBanner =
    acceptedApplication && shiftStartDate && jobTitle.length > 0 ? true : false;
  const handleOpenShiftAlert = useCallback(() => {
    if (!acceptedApplication || !shiftStartDate) return;
    navigation.navigate('ShiftAlert', {
      applicationId: acceptedApplication.id as ApplicationId,
      jobTitle,
      shiftStartIso: shiftStartDate.toISOString(),
    });
  }, [acceptedApplication, jobTitle, navigation, shiftStartDate]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonHeaderRow}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.skeletonHeaderText}>
                  <Skeleton width="60%" height={15} />
                  <Skeleton width="40%" height={12} style={styles.skeletonGap} />
                </View>
              </View>
              <Skeleton width="90%" height={13} style={styles.skeletonGapBig} />
              <Skeleton width="70%" height={13} style={styles.skeletonGap} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('applicants.title')}</Text>
        <Text style={styles.subtitle}>
          {t('applicants.totalCount', { count: applications.length })}
        </Text>
      </View>

      <FlatList
        data={applications}
        renderItem={renderApplicant}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          showCountdownBanner && shiftStartDate ? (
            <ShiftCountdownBanner
              shiftStart={shiftStartDate}
              jobTitle={jobTitle}
              onPress={handleOpenShiftAlert}
            />
          ) : null
        }
        ListHeaderComponent={
          pendingOffers.length > 0 ? (
            <View style={styles.pendingOffersSection}>
              <Text style={styles.pendingOffersTitle}>
                {t('applicants.pendingOffersSection', { count: pendingOffers.length })}
              </Text>
              {pendingOffers.map(offer => {
                const name =
                  offer.baristaFirstName || offer.baristaLastName
                    ? `${offer.baristaFirstName ?? ''} ${offer.baristaLastName ?? ''}`.trim()
                    : t('applicants.unknownBarista');
                const isCancelling = cancellingOfferIds.has(offer.id);
                const initial = name.charAt(0).toUpperCase();
                return (
                  <View key={offer.id} style={styles.pendingOfferRow}>
                    <TouchableOpacity
                      style={styles.pendingOfferTappable}
                      onPress={() => handleViewProfile(offer.baristaId)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('applicants.viewBaristaProfileA11y', {
                        name,
                        defaultValue: `Открыть профиль ${name}`,
                      })}>
                      {offer.baristaAvatarUrl ? (
                        <FastImage
                          source={{ uri: transformedImageUrl(offer.baristaAvatarUrl, 36) }}
                          style={styles.pendingOfferAvatar}
                        />
                      ) : (
                        <View style={styles.pendingOfferAvatarPlaceholder}>
                          <Text style={styles.pendingOfferAvatarText}>{initial}</Text>
                        </View>
                      )}
                      <View style={styles.pendingOfferInfo}>
                        <Text style={styles.pendingOfferName}>{name}</Text>
                        <Text style={styles.pendingOfferDate}>
                          {t('applicants.offerSentOn', {
                            date: new Date(offer.createdAt).toLocaleDateString('ru-RU'),
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pendingOfferCancelButton}
                      onPress={() => handleCancelOffer(offer)}
                      disabled={isCancelling}>
                      {isCancelling ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={styles.pendingOfferCancelText}>
                          {t('applicants.cancelOffer')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {reviewTarget && (
        <ReviewModal
          visible
          applicationId={reviewTarget.applicationId}
          raterRole="business"
          rateeId={reviewTarget.rateeId}
          onSubmitted={handleReviewSubmitted}
          onSkip={() => setReviewTarget(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  skeletonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: 6,
  },
  skeletonGapBig: {
    marginTop: 14,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  applicantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  applicantInfo: {
    flex: 1,
  },
  baristaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  experienceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  coverLetterContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  coverLetterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  coverLetterText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  appliedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  viewProfileButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: 32,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  unreadBadge: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmCompletionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmCompletionButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  confirmCompletionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shiftWaitingText: {
    marginTop: -4,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cancelShiftButton: {
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelShiftButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewBanner: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  reviewBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  pendingOffersSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingOffersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  pendingOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pendingOfferTappable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingOfferAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  pendingOfferAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pendingOfferAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingOfferInfo: { flex: 1 },
  pendingOfferName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  pendingOfferDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pendingOfferCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginLeft: 12,
  },
  pendingOfferCancelText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  disputeButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
  },
  disputeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  disputeStatusBox: {
    marginTop: 8,
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
});
