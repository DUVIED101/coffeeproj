import React, { useState, useCallback } from "react";
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
import { useFocusEffect, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { ApplicationService } from '../../services/ApplicationService';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { JobDetailsContent } from '../../components/JobDetailsContent';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import type { Job } from '../../types/job';
import type { Application } from '../../types/application';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  BusinessPublicProfile: { businessOwnerId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobDetails'>;
  route: RouteProp<BaristaStackParamList, 'JobDetails'>;
};

export const JobDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const { jobId, distance } = route.params;
  const user = useAuthStore(state => state.user);

  const [job, setJob] = useState<Job | null>(null);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [hasCheckedApplication, setHasCheckedApplication] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerAggregate, setOwnerAggregate] = useState<UserReviewAggregate | null>(null);
  const [businessReliability, setBusinessReliability] = useState<{
    disputes30d: number;
    reliabilityScore: number;
  } | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [profileCompleteness, setProfileCompleteness] = useState<number | null>(null);

  const MIN_COMPLETENESS_TO_APPLY = 20;

  useFocusEffect(
    useCallback(() => {
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
              const [agg, rel] = await Promise.all([
                ReviewService.getAggregateForUser(jobData.businessOwnerId as UserId),
                BusinessService.getBusinessReliabilityScore(jobData.businessOwnerId),
              ]);
              if (!cancelled) {
                setOwnerAggregate(agg);
                setBusinessReliability(rel);
              }
            } catch (err) {
              console.error('Error loading owner aggregate:', err);
            }
          }

          if (user?.id) {
            const application = await ApplicationService.checkApplicationExists(jobId, user.id);
            if (cancelled) return;
            setExistingApplication(application);

            try {
              const profile = await BaristaProfileService.getProfileByUserId(user.id);
              if (!cancelled) setProfileCompleteness(profile?.profileCompleteness ?? 0);
            } catch (err) {
              console.error('Error loading barista profile:', err);
            }
          }
        } catch (err) {
          if (cancelled) return;
          console.error('Error loading job details:', err);
          setError(t('jobDetails.loadFailed', { defaultValue: 'Не удалось загрузить вакансию' }));
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
    }, [jobId, user?.id, t])
  );

  const loadJob = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const jobData = await JobService.getJobById(jobId);
      setJob(jobData);
    } catch (err) {
      console.error('Error loading job:', err);
      setError(t('jobDetails.loadFailed', { defaultValue: 'Не удалось загрузить вакансию' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!job || isNavigating) return;
    if (profileCompleteness !== null && profileCompleteness < MIN_COMPLETENESS_TO_APPLY) {
      Alert.alert(
        t('jobDetails.applyBlockedTitle', { defaultValue: 'Заполните профиль' }),
        t('jobDetails.applyBlockedBody', {
          min: MIN_COMPLETENESS_TO_APPLY,
          current: profileCompleteness,
          defaultValue:
            'Профиль заполнен на {{current}}%. Чтобы откликаться на вакансии, его нужно заполнить минимум на {{min}}%.',
        })
      );
      return;
    }
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
        return t('jobDetails.status.pending', { defaultValue: 'На рассмотрении' });
      case 'under_review':
        return t('jobDetails.status.underReview', { defaultValue: 'Рассматривается' });
      case 'accepted':
        return t('jobDetails.status.accepted', { defaultValue: 'Принято' });
      case 'rejected':
        return t('jobDetails.status.rejected', { defaultValue: 'Отклонено' });
      case 'withdrawn':
        return t('jobDetails.status.withdrawn', { defaultValue: 'Отозвано' });
      default:
        return status;
    }
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
          <Text style={styles.errorText}>
            {error || t('jobDetails.notFound', { defaultValue: 'Вакансия не найдена' })}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadJob}>
            <Text style={styles.retryButtonText}>
              {t('jobDetails.retry', { defaultValue: 'Повторить' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayDistance = distance != null ? distance : job.distance;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <JobDetailsContent
          job={job}
          ownerAggregate={ownerAggregate}
          businessReliability={businessReliability}
          distance={displayDistance}
          onPhotoPress={index => {
            setViewerIndex(index);
            setViewerVisible(true);
          }}
          onBusinessPress={
            job.businessOwnerId
              ? () =>
                  navigation.navigate('BusinessPublicProfile', {
                    businessOwnerId: job.businessOwnerId,
                  })
              : undefined
          }
        />
      </ScrollView>

      {existingApplication ? (
        <View style={styles.footer}>
          <View style={styles.applicationStatus}>
            <Text style={styles.applicationStatusLabel}>
              {t('jobDetails.applicationStatus', { defaultValue: 'Статус отклика:' })}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(existingApplication.status) },
              ]}>
              <Text style={styles.statusText}>{getStatusText(existingApplication.status)}</Text>
            </View>
          </View>
          <Text style={styles.applicationDate}>
            {t('jobDetails.applied', {
              date: new Date(existingApplication.createdAt).toLocaleDateString(locale),
              defaultValue: 'Откликнулись: {{date}}',
            })}
          </Text>
        </View>
      ) : (
        <View style={styles.footer}>
          {profileCompleteness !== null && profileCompleteness < MIN_COMPLETENESS_TO_APPLY && (
            <Text style={styles.applyBlockedHint}>
              {t('jobDetails.applyBlockedHint', {
                min: MIN_COMPLETENESS_TO_APPLY,
                current: profileCompleteness,
                defaultValue:
                  'Заполните профиль до {{min}}%, чтобы откликаться. Сейчас {{current}}%.',
              })}
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.applyButton,
              (!hasCheckedApplication || isNavigating) && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!hasCheckedApplication || isNavigating}>
            <Text style={styles.applyButtonText}>
              {t('jobDetails.applyCta', { defaultValue: 'Откликнуться на вакансию' })}
            </Text>
          </TouchableOpacity>
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
  applyBlockedHint: {
    fontSize: 13,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    textAlign: 'center',
    overflow: 'hidden',
    lineHeight: 18,
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
