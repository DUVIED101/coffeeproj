import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { JobService } from '../../services/JobService';
import { JobOfferService } from '../../services/JobOfferService';
import { WorkExperienceService } from '../../services/WorkExperienceService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { getInitials } from '../../utils/getInitials';
import { StarRow } from '../../components/StarRow';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import type { BaristaProfile, ShiftTime } from '../../types/baristaProfile';
import type { BaristaProfileId, UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import type { WorkExperience } from '../../types/workExperience';
import { computeDuration, computeTotalDuration } from '../../types/workExperience';
import { isCityCode } from '../../types/city';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'ViewBaristaProfile'>;
  route: RouteProp<BusinessStackParamList, 'ViewBaristaProfile'>;
};

const SHIFT_TIME_VALUES: readonly ShiftTime[] = ['morning', 'afternoon', 'evening', 'night'];

const formatMonthYearShort = (year: number, month: number): string => {
  const d = new Date(year, month - 1, 1);
  const formatted = d.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const ViewBaristaProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { baristaId } = route.params;
  const currentUser = useAuthStore(state => state.user);
  const { t } = useTranslation();

  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [aggregate, setAggregate] = useState<UserReviewAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasOfferableJobs, setHasOfferableJobs] = useState<boolean | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadProfile(),
        ReviewService.getAggregateForUser(baristaId as UserId).then(setAggregate),
      ]);
    } catch (error) {
      console.error('Error refreshing barista profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [baristaId]);

  const openViewer = useCallback((photos: string[], startIndex: number) => {
    setViewerPhotos(photos);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  }, []);

  useEffect(() => {
    loadProfile();
    ReviewService.getAggregateForUser(baristaId as UserId)
      .then(setAggregate)
      .catch(err => console.error('Error loading review aggregate:', err));
  }, [baristaId]);

  useEffect(() => {
    if (currentUser?.accountType !== 'business' || !currentUser.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [openJobs, pendingOffers] = await Promise.all([
          JobService.getJobsByOwnerId(currentUser.id, true),
          JobOfferService.getPendingOffersFromOwnerToBarista(
            currentUser.id as UserId,
            baristaId as UserId
          ),
        ]);
        if (cancelled) return;
        const offered = new Set<string>(pendingOffers.map(o => o.jobId));
        setHasOfferableJobs(openJobs.some(job => !offered.has(job.id)));
      } catch (error) {
        console.error('Error checking offerable jobs:', error);
        if (!cancelled) setHasOfferableJobs(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baristaId, currentUser?.accountType, currentUser?.id]);

  const handleOfferJob = useCallback(() => {
    if (!profile) return;
    navigation.navigate('OfferJob', { baristaId: profile.userId });
  }, [navigation, profile]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await BaristaProfileService.getProfileByUserId(baristaId);

      if (!profileData) {
        Alert.alert(t('viewBarista.errorTitle'), t('viewBarista.errorNotFound'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
        return;
      }

      const workExperiences = await WorkExperienceService.listForProfile(
        profileData.id as BaristaProfileId
      );
      setProfile({ ...profileData, workExperiences });
    } catch (error: unknown) {
      console.error('Error loading profile:', error);
      Alert.alert(t('viewBarista.errorTitle'), t('viewBarista.errorLoad'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
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

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <TouchableOpacity
                onPress={() => openViewer([profile.avatarUrl as string], 0)}
                accessibilityLabel={t('viewBarista.viewAvatarA11y')}>
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {getInitials(profile.firstName, profile.lastName)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.city}>
              {isCityCode(profile.city) ? t(`city.codes.${profile.city}`) : profile.city}
            </Text>
            {profile.yearsOfExperience !== undefined && profile.yearsOfExperience > 0 && (
              <Text style={styles.experience}>
                {t('viewBarista.yearsExperience', { count: profile.yearsOfExperience })}
              </Text>
            )}
            {aggregate && aggregate.reviewCount > 0 && (
              <View style={styles.aggregateRow}>
                <StarRow
                  rating={aggregate.averageRating}
                  count={aggregate.reviewCount}
                  showValue
                  size={14}
                />
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.reviewsLink}
          onPress={() => navigation.navigate('UserReviews', { userId: baristaId })}>
          <Text style={styles.reviewsLinkLabel}>{t('viewBarista.allReviews')}</Text>
          <Text style={styles.reviewsLinkChevron}>›</Text>
        </TouchableOpacity>

        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.about')}</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {(profile.workExperiences ?? []).length > 0 && (
          <View style={styles.section}>
            <View style={styles.workExpHeader}>
              <Text style={styles.sectionTitle}>{t('barista.workExperience.title')}</Text>
              {(() => {
                const total = computeTotalDuration(profile.workExperiences ?? []);
                return (
                  <Text style={styles.workExpTotal}>
                    {t('barista.workExperience.totalShort', {
                      years: total.years,
                      months: total.months,
                    })}
                  </Text>
                );
              })()}
            </View>
            {(profile.workExperiences ?? []).map((exp: WorkExperience) => {
              const start = formatMonthYearShort(exp.startYear, exp.startMonth);
              const rangeLabel =
                exp.isCurrent || exp.endYear === null || exp.endMonth === null
                  ? t('barista.workExperience.currentRange', { start })
                  : t('barista.workExperience.rangeWithEnd', {
                      start,
                      end: formatMonthYearShort(exp.endYear, exp.endMonth),
                    });
              const duration = computeDuration({
                startYear: exp.startYear,
                startMonth: exp.startMonth,
                endYear: exp.endYear,
                endMonth: exp.endMonth,
                isCurrent: exp.isCurrent,
              });
              return (
                <View key={exp.id} style={styles.workExpRow}>
                  <Text style={styles.workExpTitle}>
                    {exp.position} · {exp.employer}
                  </Text>
                  <Text style={styles.workExpRange}>
                    {rangeLabel} ·{' '}
                    {t('barista.workExperience.duration', {
                      years: duration.years,
                      months: duration.months,
                    })}
                  </Text>
                  {exp.description && (
                    <Text style={styles.workExpDescription}>{exp.description}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {profile.equipmentExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.equipmentExperience')}</Text>
            <View style={styles.chipsContainer}>
              {profile.equipmentExperience.map(equipment => (
                <View key={equipment} style={styles.chip}>
                  <Text style={styles.chipText}>{equipment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.certifications')}</Text>
            {profile.certifications.map((cert, index) => (
              <Text key={`${index}-${cert}`} style={styles.certificationItem}>
                {index + 1}. {cert}
              </Text>
            ))}
          </View>
        )}

        {profile.preferredMetroStations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.preferredMetro')}</Text>
            <View style={styles.chipsContainer}>
              {profile.preferredMetroStations.map(station => (
                <View key={station} style={styles.chip}>
                  <Text style={styles.chipText}>{station}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.preferredShiftTimes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.preferredShiftTimes')}</Text>
            <View style={styles.chipsContainer}>
              {profile.preferredShiftTimes.map(shift => (
                <View key={shift} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {SHIFT_TIME_VALUES.includes(shift) ? t(`shiftTimes.${shift}`) : shift}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(typeof profile.hourlyRateMin === 'number' ||
          typeof profile.hourlyRateMax === 'number') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.hourlyRate')}</Text>
            <Text style={styles.infoText}>
              {(() => {
                const min =
                  typeof profile.hourlyRateMin === 'number' ? `${profile.hourlyRateMin} RUB` : null;
                const max =
                  typeof profile.hourlyRateMax === 'number' ? `${profile.hourlyRateMax} RUB` : null;
                if (min && max && profile.hourlyRateMin !== profile.hourlyRateMax)
                  return `${min} – ${max}`;
                return min ?? max;
              })()}
            </Text>
          </View>
        )}

        {profile.portfolioPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('viewBarista.portfolio')}</Text>
            <View style={styles.portfolioGrid}>
              {profile.portfolioPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => openViewer(profile.portfolioPhotos, index)}
                  accessibilityLabel={t('viewBarista.viewPortfolioPhotoA11y', {
                    index: index + 1,
                  })}>
                  <Image source={{ uri: photo }} style={styles.portfolioPhoto} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {currentUser?.accountType === 'business' && profile.isActivelyLooking && (
          <View style={styles.messageButtonContainer}>
            <TouchableOpacity
              style={[
                styles.messageButton,
                hasOfferableJobs === false && styles.messageButtonDisabled,
              ]}
              onPress={handleOfferJob}
              disabled={hasOfferableJobs === false}
              activeOpacity={0.7}>
              <Text style={styles.messageButtonText}>{t('viewBarista.offerJob')}</Text>
            </TouchableOpacity>
            {hasOfferableJobs === false && (
              <Text style={styles.offerJobHint}>{t('viewBarista.offerJobAllOffered')}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <FullscreenImageViewer
        visible={viewerVisible}
        photos={viewerPhotos}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  city: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  experience: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  aggregateRow: {
    marginTop: 8,
  },
  reviewsLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
  },
  reviewsLinkLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewsLinkChevron: {
    fontSize: 22,
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
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  certificationItem: {
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 4,
  },
  workExpHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  workExpTotal: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  workExpRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  workExpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  workExpRange: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workExpDescription: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  messageButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  messageButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  offerJobHint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
