import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { transformedImageUrl } from '../../utils/imageTransform';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, RADII } from '../../config/constants';
import { EquipmentChips, EquipmentChipsDisplay } from '../../components/EquipmentChips';
import {
  BaristaProfileService,
  PortfolioPhotoLimitError,
} from '../../services/BaristaProfileService';
import { WorkExperienceService } from '../../services/WorkExperienceService';
import { PHOTO_LIMIT } from '../../utils/storage';
import { pickPhotos, reportRejections } from '../../utils/pickPhotos';
import { ReviewService } from '../../services/ReviewService';
import { MetroSelector, isMetroAnySelection } from '../../components/MetroSelector';
import { CityToggle } from '../../components/CityToggle';
import { StarRow } from '../../components/StarRow';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import { pickAndCropAvatar } from '../../utils/imageCrop';
import { CertificatesEditor } from '../../components/CertificatesEditor';
import { WorkExperienceEditor } from '../../components/WorkExperienceEditor';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { Skeleton } from '../../components/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { formatLocalDate } from '../../utils/dateUtils';
import {
  computeProfileCompleteness,
  type CompletenessItemKey,
} from '../../utils/profileCompleteness';
import { requestLocationPermission, getCurrentLocation } from '../../utils/geolocation';
import { clampToEffectiveLength } from '../../utils/textLength';
import { dobMinDate, dobMaxDate } from '../../utils/dateRanges';
import { yearsBetween } from '../../utils/age';
import {
  sanitizeNameInput,
  sanitizeYearsInput,
  sanitizeDigitsInput,
  NAME_MAX_LENGTH,
  YEARS_MAX_LENGTH,
  COMPENSATION_MAX_DIGITS,
} from '../../utils/validation';
import type { GeoPoint } from '../../types/business';
import type { BaristaProfile, ReliabilityScore, ShiftTime } from '../../types/baristaProfile';
import type { CityCode } from '../../types/city';
import { DEFAULT_CITY, toCityCode, CITY_LABELS_RU } from '../../types/city';
import type { BaristaProfileId, UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';
import type {
  WorkExperience,
  WorkExperienceDraft,
  WorkExperienceFieldError,
} from '../../types/workExperience';
import { computeDuration, computeTotalDuration, findDraftErrors } from '../../types/workExperience';
import { computeMedicalBookStatus, type MedicalBookStatus } from '../../utils/medicalBook';
import { showErrorToast } from '../../stores/errorToastStore';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'BaristaProfile'>;
};

type EditableSectionKey =
  | 'personal'
  | 'professional'
  | 'workExperience'
  | 'preferences'
  | 'portfolio';

const COMPLETENESS_TO_SECTION: Record<CompletenessItemKey, EditableSectionKey> = {
  basicInfo: 'personal',
  bio: 'professional',
  experience: 'professional',
  workHistory: 'workExperience',
  preferences: 'preferences',
  hourlyRate: 'preferences',
  portfolio: 'portfolio',
  medicalBook: 'professional',
};

const SHIFT_TIME_KEYS: { value: ShiftTime; labelKey: string }[] = [
  { value: 'morning', labelKey: 'shiftTimes.morning' },
  { value: 'afternoon', labelKey: 'shiftTimes.afternoon' },
  { value: 'evening', labelKey: 'shiftTimes.evening' },
  { value: 'night', labelKey: 'shiftTimes.night' },
];

const getCompletenessColor = (completeness: number): string => {
  if (completeness < 50) return COLORS.error;
  if (completeness < 80) return COLORS.warning;
  return COLORS.success;
};

const medicalBookBadgeStyle = (status: MedicalBookStatus) => {
  switch (status) {
    case 'valid':
      return { backgroundColor: 'rgba(39, 174, 96, 0.12)' };
    case 'expiringSoon':
      return { backgroundColor: 'rgba(243, 156, 18, 0.14)' };
    case 'expired':
      return { backgroundColor: 'rgba(231, 76, 60, 0.14)' };
    default:
      return { backgroundColor: COLORS.backgroundSecondary };
  }
};

const medicalBookBadgeTextStyle = (status: MedicalBookStatus) => {
  switch (status) {
    case 'valid':
      return { color: COLORS.success };
    case 'expiringSoon':
      return { color: COLORS.warning };
    case 'expired':
      return { color: COLORS.error };
    default:
      return { color: COLORS.textSecondary };
  }
};

const formatMonthYear = (year: number, month: number, locale: string): string => {
  const d = new Date(year, month - 1, 1);
  const formatted = d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const WorkExperienceList: React.FC<{ experiences: WorkExperience[] }> = React.memo(
  ({ experiences }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

    if (experiences.length === 0) {
      return <Text style={styles.emptyText}>{t('barista.workExperience.empty')}</Text>;
    }

    return (
      <>
        {experiences.map(exp => {
          const start = formatMonthYear(exp.startYear, exp.startMonth, locale);
          const rangeLabel =
            exp.isCurrent || exp.endYear === null || exp.endMonth === null
              ? t('barista.workExperience.currentRange', { start })
              : t('barista.workExperience.rangeWithEnd', {
                  start,
                  end: formatMonthYear(exp.endYear, exp.endMonth, locale),
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
              {exp.description && <Text style={styles.workExpDescription}>{exp.description}</Text>}
            </View>
          );
        })}
      </>
    );
  }
);
WorkExperienceList.displayName = 'WorkExperienceList';

export const BaristaProfileScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore(state => state.user);
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [reliability, setReliability] = useState<ReliabilityScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState<CityCode>(DEFAULT_CITY);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [medicalBookExpiresOn, setMedicalBookExpiresOn] = useState<string>('');
  const [showMedicalBookPicker, setShowMedicalBookPicker] = useState(false);
  const [preferredMetroStations, setPreferredMetroStations] = useState<string[]>([]);
  const [selectedShiftTimes, setSelectedShiftTimes] = useState<ShiftTime[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState('');
  const [isActivelyLooking, setIsActivelyLooking] = useState(true);
  const [workExperienceDrafts, setWorkExperienceDrafts] = useState<WorkExperienceDraft[]>([]);
  const [workExperienceErrors, setWorkExperienceErrors] = useState<
    ReadonlyArray<ReadonlyArray<WorkExperienceFieldError>>
  >([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2000, 0, 1));
  const [aggregate, setAggregate] = useState<UserReviewAggregate | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(undefined);

  const scrollViewRef = useRef<ScrollView | null>(null);
  // Records the Y offset of each editable section so handleEdit can jump
  // straight to the first one that's still empty.
  const sectionOffsetsRef = useRef<Partial<Record<EditableSectionKey, number>>>({});

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadProfile(), loadAggregate()]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const openViewer = useCallback((photos: string[], startIndex: number) => {
    setViewerPhotos(photos);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  }, []);

  // Location permission is one-shot — runs on mount only.
  useEffect(() => {
    initializeLocation();
  }, []);

  // Re-fetch on every focus so a profile that was just created in
  // BaristaProfileSetup (same session, no app restart) is picked up even if the
  // screen never unmounted. useFocusEffect ALSO fires on first focus (= mount),
  // so a separate useEffect for loadProfile/loadAggregate would double every
  // request on cold-mount.
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadAggregate();
    }, [])
  );

  const initializeLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;
      const location = await getCurrentLocation();
      if (location) setUserLocation(location);
    } catch (error) {
      console.warn('Error initializing location for metro picker:', error);
    }
  };

  const loadAggregate = async () => {
    if (!user?.id) return;
    try {
      const data = await ReviewService.getAggregateForUser(user.id as UserId);
      setAggregate(data);
    } catch (error) {
      console.error('Error loading review aggregate:', error);
    }
  };

  const loadProfile = async () => {
    if (!user?.id) {
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorNotAuthenticated', {
          defaultValue: 'Пользователь не авторизован',
        })
      );
      return;
    }

    try {
      setIsLoading(true);
      const profileData = await BaristaProfileService.getProfileByUserId(user.id);

      if (!profileData) {
        setProfile(null);
        return;
      }

      const workExperiences = await WorkExperienceService.listForProfile(
        profileData.id as BaristaProfileId
      );
      const enriched: BaristaProfile = { ...profileData, workExperiences };

      setProfile(enriched);
      populateFields(enriched);

      if (user?.id) {
        BaristaProfileService.getReliabilityScore(user.id as UserId)
          .then(setReliability)
          .catch(() => {});
      }
    } catch (error: unknown) {
      console.error('Error loading profile:', error);
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorLoad', { defaultValue: 'Не удалось загрузить профиль' })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const populateFields = (profileData: BaristaProfile) => {
    setFirstName(profileData.firstName);
    setLastName(profileData.lastName);
    setCity(toCityCode(profileData.city));
    setDateOfBirth(profileData.dateOfBirth || '');
    if (profileData.dateOfBirth) {
      setSelectedDate(new Date(profileData.dateOfBirth));
    }
    setBio(profileData.bio || '');
    setYearsOfExperience(
      profileData.yearsOfExperience != null ? String(profileData.yearsOfExperience) : ''
    );
    setSelectedEquipment(profileData.equipmentExperience);
    setCertifications(profileData.certifications);
    setPreferredMetroStations(profileData.preferredMetroStations);
    setSelectedShiftTimes(profileData.preferredShiftTimes);
    setHourlyRateMin(profileData.hourlyRateMin != null ? String(profileData.hourlyRateMin) : '');
    setMedicalBookExpiresOn(profileData.medicalBookExpiresOn ?? '');
    setIsActivelyLooking(profileData.isActivelyLooking);
    setWorkExperienceDrafts(
      (profileData.workExperiences ?? []).map(e => ({
        id: e.id,
        employer: e.employer,
        position: e.position,
        startYear: e.startYear,
        startMonth: e.startMonth,
        endYear: e.endYear,
        endMonth: e.endMonth,
        isCurrent: e.isCurrent,
        description: e.description,
      }))
    );
  };

  const toggleEquipment = useCallback((equipment: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  }, []);

  const toggleShiftTime = useCallback((shift: ShiftTime) => {
    setSelectedShiftTimes(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  }, []);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setDateOfBirth(formatLocalDate(date));
    }
  }, []);

  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return t('baristaProfileScreen.selectDate', { defaultValue: 'Выберите дату' });
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAvatarPick = useCallback(async () => {
    if (!user?.id) return;
    const outcome = await pickAndCropAvatar();
    if (!outcome.ok) {
      if (outcome.reason === 'cancelled') return;
      const bodyKey =
        outcome.reason === 'tooLarge'
          ? 'photoErrors.tooLarge_one'
          : outcome.reason === 'invalidFormat'
            ? 'photoErrors.invalidFormat_one'
            : 'photoErrors.uploadFailedBody';
      showErrorToast(t(bodyKey, { maxMb: 7, count: 1 }) as string);
      return;
    }
    try {
      setIsSaving(true);
      await BaristaProfileService.uploadAvatar(user.id, outcome.uri);
      await loadProfile();
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorAvatarUpload', {
          defaultValue: 'Не удалось загрузить аватар. Попробуйте ещё раз.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, t]);

  const handleAddCertificate = async (name: string): Promise<void> => {
    if (!user?.id || !profile) return;
    try {
      setIsSaving(true);
      const next = [...profile.certifications, name];
      setCertifications(next);
      await BaristaProfileService.setCertifications(user.id, next);
      await loadProfile();
    } catch (error: unknown) {
      console.error('Error saving certificate:', error);
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorSaveCert', {
          defaultValue: 'Не удалось сохранить сертификат. Попробуйте ещё раз.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCertificate = async (cert: string): Promise<void> => {
    if (!user?.id || !profile) return;
    try {
      setIsSaving(true);
      const next = profile.certifications.filter(c => c !== cert);
      setCertifications(next);
      await BaristaProfileService.setCertifications(user.id, next);
      await loadProfile();
    } catch (error: unknown) {
      console.error('Error removing certificate:', error);
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorRemoveCert', {
          defaultValue: 'Не удалось удалить сертификат.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePortfolioPhotoUpload = async () => {
    if (!user?.id || !profile) return;

    const remaining = PHOTO_LIMIT - profile.portfolioPhotos.length;
    if (remaining <= 0) {
      Alert.alert(t('common.warning'), t('portfolioPhotos.limitReached', { max: PHOTO_LIMIT }));
      return;
    }

    const picked = await pickPhotos({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (!picked) return;
    const shouldProceed = reportRejections(t, picked);
    if (!shouldProceed) return;

    setIsSaving(true);
    let uploadedCount = 0;
    let hitLimit = false;
    let lastError: unknown = null;
    try {
      for (const asset of picked.accepted) {
        if (!asset.uri) continue;
        try {
          await BaristaProfileService.uploadPortfolioPhoto(user.id, asset.uri);
          uploadedCount += 1;
        } catch (error: unknown) {
          if (error instanceof PortfolioPhotoLimitError) {
            hitLimit = true;
            break;
          }
          console.error('Error uploading portfolio photo:', error);
          lastError = error;
        }
      }
    } finally {
      if (uploadedCount > 0) await loadProfile();
      setIsSaving(false);
    }

    if (hitLimit) {
      Alert.alert(t('common.warning'), t('portfolioPhotos.limitReached', { max: PHOTO_LIMIT }));
    } else if (uploadedCount < picked.accepted.length) {
      const detail = (lastError as { message?: string } | null)?.message ?? String(lastError ?? '');
      Alert.alert(
        t('photoErrors.uploadFailedTitle'),
        `${t('photoErrors.uploadFailedBody')}${detail ? `\n\n${detail}` : ''}`
      );
    }
  };

  const handleRemovePortfolioPhoto = (photoUrl: string): void => {
    if (!user?.id) return;
    Alert.alert(
      t('baristaProfileScreen.removePhotoTitle', { defaultValue: 'Удалить фото' }),
      t('baristaProfileScreen.removePhotoBody', {
        defaultValue: 'Удалить это фото из портфолио?',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Отмена' }), style: 'cancel' },
        {
          text: t('baristaProfileScreen.remove', { defaultValue: 'Удалить' }),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await BaristaProfileService.removePortfolioPhoto(user.id, photoUrl);
              await loadProfile();
            } catch (error: unknown) {
              console.error('Error removing portfolio photo:', error);
              Alert.alert(
                t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
                t('baristaProfileScreen.errorRemovePhoto', {
                  defaultValue: 'Не удалось удалить фото. Попробуйте ещё раз.',
                })
              );
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSectionLayout = useCallback(
    (key: EditableSectionKey) => (event: { nativeEvent: { layout: { y: number } } }) => {
      sectionOffsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  const scrollToFirstEmpty = useCallback(() => {
    if (!profile) return;
    const completeness = computeProfileCompleteness(profile);
    const firstMissing = completeness.items.find(item => !item.satisfied);
    if (!firstMissing) return;
    const targetKey = COMPLETENESS_TO_SECTION[firstMissing.key];
    const offset = sectionOffsetsRef.current[targetKey];
    if (offset === undefined) return;
    scrollViewRef.current?.scrollTo({ y: Math.max(offset - 16, 0), animated: true });
  }, [profile]);

  const handleEdit = () => {
    setIsEditing(true);
    // Section layouts shift when inputs expand inline; wait one frame so the
    // measured offsets reflect the edit-mode layout before scrolling.
    requestAnimationFrame(() => scrollToFirstEmpty());
  };

  const handleCancel = () => {
    if (profile) {
      populateFields(profile);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorNotAuthenticated', {
          defaultValue: 'Пользователь не авторизован',
        })
      );
      return;
    }

    const draftErrors = workExperienceDrafts.map(findDraftErrors);
    if (draftErrors.some(e => e.length > 0)) {
      setWorkExperienceErrors(draftErrors);
      const offset = sectionOffsetsRef.current.workExperience;
      if (offset !== undefined) {
        scrollViewRef.current?.scrollTo({ y: Math.max(offset - 16, 0), animated: true });
      }
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('barista.workExperience.errors.fillRequired', {
          defaultValue: 'Заполните обязательные поля или удалите запись опыта.',
        })
      );
      return;
    }
    setWorkExperienceErrors([]);

    try {
      setIsSaving(true);

      const updatedProfile = await BaristaProfileService.updateProfile(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city,
        dateOfBirth: dateOfBirth.trim() || undefined,
        bio: bio.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseFloat(yearsOfExperience) : undefined,
        equipmentExperience: selectedEquipment,
        certifications,
        preferredMetroStations,
        preferredShiftTimes: selectedShiftTimes,
        hourlyRateMin: hourlyRateMin ? parseInt(hourlyRateMin, 10) : undefined,
        medicalBookExpiresOn: medicalBookExpiresOn || undefined,
        isActivelyLooking,
      });

      const savedExperiences = await WorkExperienceService.replaceAll(
        updatedProfile.id as BaristaProfileId,
        workExperienceDrafts
      );

      setProfile({ ...updatedProfile, workExperiences: savedExperiences });
      setIsEditing(false);
      Alert.alert(
        t('baristaProfileScreen.successTitle', { defaultValue: 'Готово' }),
        t('baristaProfileScreen.successProfile', { defaultValue: 'Профиль успешно обновлён!' })
      );
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      Alert.alert(
        t('baristaProfileScreen.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaProfileScreen.errorUpdate', {
          defaultValue: 'Не удалось обновить профиль. Попробуйте ещё раз.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.skeletonRoot}>
          <View style={styles.skeletonHero}>
            <Skeleton width={96} height={96} borderRadius={48} />
            <Skeleton width="50%" height={20} style={styles.skeletonGapBig} />
            <Skeleton width="35%" height={14} style={styles.skeletonGap} />
          </View>
          <Skeleton width="100%" height={140} borderRadius={12} style={styles.skeletonBlock} />
          <Skeleton width="100%" height={140} borderRadius={12} style={styles.skeletonBlock} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ScreenHeaderWithActions
          title={t('baristaProfileScreen.title', { defaultValue: 'Профиль' })}
          actions={[
            {
              icon: 'bell-outline',
              badgeCount: unreadCount,
              onPress: () => navigation.navigate('NotificationFeed'),
              testID: 'bell',
            },
            {
              icon: 'cog-outline',
              onPress: () => navigation.navigate('Settings'),
              testID: 'settings',
            },
          ]}
        />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="coffee-outline" size={56} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>
            {t('baristaProfile.noProfileTitle', { defaultValue: 'Профиль ещё не создан' })}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t('baristaProfile.noProfileSubtitle', {
              defaultValue:
                'Создайте профиль, чтобы откликаться на вакансии и получать предложения от заведений.',
            })}
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate('BaristaProfileSetup')}
            activeOpacity={0.85}>
            <Text style={styles.emptyCtaText}>
              {t('baristaProfile.createCta', { defaultValue: 'Создать профиль' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completeness = computeProfileCompleteness(profile);
  const completenessColor = getCompletenessColor(completeness.percent);
  const missingItems = completeness.items.filter(item => !item.satisfied);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScreenHeaderWithActions
        title={t('baristaProfileScreen.title', { defaultValue: 'Профиль' })}
        actions={[
          {
            icon: 'bell-outline',
            badgeCount: unreadCount,
            onPress: () => navigation.navigate('NotificationFeed'),
            testID: 'bell',
          },
          {
            icon: 'cog-outline',
            onPress: () => navigation.navigate('Settings'),
            testID: 'settings',
          },
        ]}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }>
          <View style={styles.header}>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editPencilButton}
                onPress={handleEdit}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('baristaProfileScreen.edit', {
                  defaultValue: 'Изменить',
                })}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <TouchableOpacity
                  onPress={() => openViewer([profile.avatarUrl as string], 0)}
                  accessibilityLabel={t('baristaProfileScreen.viewAvatarA11y', {
                    defaultValue: 'Открыть аватар на весь экран',
                  })}>
                  <FastImage
                    source={{ uri: transformedImageUrl(profile.avatarUrl, 80) }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.avatarUploadButton}
                onPress={handleAvatarPick}
                disabled={isSaving}>
                <Text style={styles.avatarUploadButtonText}>
                  {profile.avatarUrl
                    ? t('baristaProfileScreen.changePhoto', { defaultValue: 'Изменить' })
                    : t('baristaProfileScreen.addPhoto', { defaultValue: 'Добавить фото' })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.name}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.city}>{CITY_LABELS_RU[toCityCode(profile.city)]}</Text>
              {(() => {
                const age = yearsBetween(profile.dateOfBirth);
                return age !== null ? (
                  <Text style={styles.city}>
                    {t('baristaProfileScreen.yearsOld', { count: age })}
                  </Text>
                ) : null;
              })()}

              <View style={styles.completenessContainer}>
                <View style={styles.completenessBar}>
                  <View
                    style={[
                      styles.completenessBarFill,
                      {
                        width: `${completeness.percent}%`,
                        backgroundColor: completenessColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.completenessText, { color: completenessColor }]}>
                  {t('barista.profileCompleteness', { percent: completeness.percent })}
                </Text>
                {missingItems.length > 0 && (
                  <View style={styles.missingContainer}>
                    <Text style={styles.missingTitle}>
                      {t('barista.completeness.missingTitle')}:
                    </Text>
                    {missingItems.map(item => (
                      <Text key={item.key} style={styles.missingItem}>
                        • {t(`barista.completeness.items.${item.key}`)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section} onLayout={handleSectionLayout('personal')}>
            {/* Edit mode keeps an inline Save/Cancel row at the top of the
                form (previously this lived in the section header alongside
                "Личная информация" — now removed for visual simplicity).
                View mode shows no chrome here at all; the entry point is the
                pencil icon on the avatar card above. */}
            {isEditing && (
              <View style={styles.editActionsRow}>
                <TouchableOpacity onPress={handleCancel} hitSlop={8}>
                  <Text style={styles.cancelButton}>
                    {t('baristaProfileScreen.cancel', { defaultValue: 'Отмена' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={8}>
                  <Text style={styles.saveButton}>
                    {isSaving
                      ? t('baristaProfileScreen.saving', { defaultValue: 'Сохранение…' })
                      : t('baristaProfileScreen.save', { defaultValue: 'Сохранить' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isEditing ? (
              <>
                <Text style={styles.label}>
                  {t('baristaProfileScreen.firstName', { defaultValue: 'Имя' })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={text => setFirstName(sanitizeNameInput(text))}
                  maxLength={NAME_MAX_LENGTH}
                  editable={isEditing}
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.lastName', { defaultValue: 'Фамилия' })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={text => setLastName(sanitizeNameInput(text))}
                  maxLength={NAME_MAX_LENGTH}
                  editable={isEditing}
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.city', { defaultValue: 'Город' })}
                </Text>
                <CityToggle
                  value={city}
                  onChange={nextCity => {
                    setCity(nextCity);
                    setPreferredMetroStations([]);
                  }}
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.dateOfBirth', { defaultValue: 'Дата рождения' })}
                </Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}>
                  <Text
                    style={[styles.datePickerText, !dateOfBirth && styles.datePickerPlaceholder]}>
                    {dateOfBirth
                      ? formatDisplayDate(dateOfBirth)
                      : t('baristaProfileScreen.selectDate', { defaultValue: 'Выберите дату' })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      themeVariant="light"
                      textColor="#000000"
                      onChange={handleDateChange}
                      maximumDate={dobMaxDate()}
                      minimumDate={dobMinDate()}
                    />
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.datePickerDoneText}>
                        {t('baristaProfileScreen.done', { defaultValue: 'Готово' })}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              // View mode: navigation rows render directly under the heading,
              // forming subsections of "Личная информация" instead of a
              // separate framed block. This avoids the double-divider noise
              // the standalone nav section was producing.
              <View>
                <TouchableOpacity
                  style={styles.subsectionRow}
                  onPress={() => navigation.navigate('ShiftHistory')}>
                  <View style={styles.historyRowLeft}>
                    <Text style={styles.historyRowTitle}>
                      {t('baristaProfileScreen.shiftHistory', { defaultValue: 'История смен' })}
                    </Text>
                  </View>
                  <Text style={styles.historyRowChevron}>›</Text>
                </TouchableOpacity>

                {user?.id && (
                  <TouchableOpacity
                    style={styles.subsectionRow}
                    onPress={() =>
                      navigation.navigate('UserReviews', { userId: user.id as string })
                    }>
                    <View style={styles.historyRowLeft}>
                      <Text style={styles.historyRowTitle}>
                        {t('baristaProfileScreen.allReviews', { defaultValue: 'Все отзывы' })}
                      </Text>
                      {aggregate && aggregate.reviewCount > 0 ? (
                        <StarRow
                          rating={aggregate.averageRating}
                          count={aggregate.reviewCount}
                          showValue
                          size={14}
                        />
                      ) : (
                        <Text style={styles.historyRowSubtitle}>
                          {t('reviews.noRatingsShort', { defaultValue: 'Без оценок' })}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.historyRowChevron}>›</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.subsectionRow}
                  onPress={() => navigation.navigate('Settings', { screen: 'MyDisputes' })}>
                  <View style={styles.historyRowLeft}>
                    <Text style={styles.historyRowTitle}>{t('reliability.sectionTitle')}</Text>
                    {reliability ? (
                      <Text style={styles.historyRowSubtitle}>
                        {t('reliability.scoreOf', {
                          score: reliability.reliabilityScore.toFixed(1),
                        })}
                        {reliability.incidents30d > 0
                          ? ` · ${t('reliability.incidents', { count: reliability.incidents30d })}`
                          : ` · ${t('reliability.noIncidents')}`}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.historyRowChevron}>›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section} onLayout={handleSectionLayout('professional')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('baristaProfileScreen.professionalInfo', {
                  defaultValue: 'Профессиональная информация',
                })}
              </Text>
            </View>

            {isEditing ? (
              <>
                <Text style={styles.label}>
                  {t('baristaProfileScreen.bio', { defaultValue: 'О себе' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={text => setBio(clampToEffectiveLength(text, 500))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={isEditing}
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.yearsExperience', { defaultValue: 'Стаж в годах' })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={yearsOfExperience}
                  onChangeText={text => setYearsOfExperience(sanitizeYearsInput(text))}
                  maxLength={YEARS_MAX_LENGTH}
                  keyboardType="decimal-pad"
                  editable={isEditing}
                  returnKeyType="done"
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.equipmentExperience', {
                    defaultValue: 'Опыт работы с оборудованием',
                  })}
                </Text>
                <EquipmentChips selected={selectedEquipment} onToggle={toggleEquipment} />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.certifications', { defaultValue: 'Сертификаты' })}
                </Text>
                <CertificatesEditor
                  certificates={profile?.certifications ?? certifications}
                  isBusy={isSaving}
                  onAdd={handleAddCertificate}
                  onRemove={handleRemoveCertificate}
                />

                <Text style={styles.label}>{t('medicalBook.label')}</Text>
                <Text style={styles.medicalBookHelper}>{t('medicalBook.helper')}</Text>
                <View style={styles.medicalBookRow}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.medicalBookButton]}
                    onPress={() => setShowMedicalBookPicker(true)}>
                    <Text
                      style={[
                        styles.datePickerText,
                        !medicalBookExpiresOn && styles.datePickerPlaceholder,
                      ]}>
                      {medicalBookExpiresOn
                        ? formatDisplayDate(medicalBookExpiresOn)
                        : t('medicalBook.noDate')}
                    </Text>
                  </TouchableOpacity>
                  {medicalBookExpiresOn && (
                    <TouchableOpacity
                      style={styles.medicalBookClearButton}
                      onPress={() => setMedicalBookExpiresOn('')}
                      hitSlop={8}>
                      <Text style={styles.medicalBookClearText}>
                        {t('common.delete', { defaultValue: 'Удалить' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {showMedicalBookPicker && (
                  <>
                    <DateTimePicker
                      value={medicalBookExpiresOn ? new Date(medicalBookExpiresOn) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      themeVariant="light"
                      textColor="#000000"
                      onChange={(_, date) => {
                        if (date) setMedicalBookExpiresOn(formatLocalDate(date));
                        if (Platform.OS !== 'ios') setShowMedicalBookPicker(false);
                      }}
                      minimumDate={new Date()}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.datePickerDoneButton}
                        onPress={() => setShowMedicalBookPicker(false)}>
                        <Text style={styles.datePickerDoneText}>
                          {t('baristaProfileScreen.done', { defaultValue: 'Готово' })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            ) : (
              (() => {
                const hasBio = !!profile.bio;
                const hasYears = profile.yearsOfExperience != null && profile.yearsOfExperience > 0;
                const hasEquipment = profile.equipmentExperience.length > 0;
                const hasCerts = profile.certifications.length > 0;
                // The medical book row renders unconditionally — `none` becomes
                // a visible "Нет санкнижки" badge so employers see the absence
                // explicitly rather than a missing field.
                const medStatus = computeMedicalBookStatus(profile.medicalBookExpiresOn);
                return (
                  <>
                    {hasBio && <Text style={styles.bioText}>{profile.bio}</Text>}
                    {hasYears && (
                      <Text style={styles.infoText}>
                        {t('baristaProfileScreen.experience', {
                          years: t('barista.experienceYears', {
                            count: profile.yearsOfExperience,
                          }),
                          defaultValue: 'Стаж: {{years}}',
                        })}
                      </Text>
                    )}
                    {hasEquipment && (
                      <>
                        <Text style={styles.label}>
                          {t('baristaProfileScreen.equipment', { defaultValue: 'Оборудование' })}
                        </Text>
                        <EquipmentChipsDisplay selected={profile.equipmentExperience} />
                      </>
                    )}
                    {hasCerts && (
                      <>
                        <Text style={styles.label}>
                          {t('baristaProfileScreen.certifications', {
                            defaultValue: 'Сертификаты',
                          })}
                        </Text>
                        {profile.certifications.map((cert, index) => (
                          <Text key={`${index}-${cert}`} style={styles.certificationItem}>
                            {index + 1}. {cert}
                          </Text>
                        ))}
                      </>
                    )}
                    <View style={styles.medicalBookDisplay}>
                      <Text style={styles.label}>{t('medicalBook.label')}</Text>
                      <View style={[styles.medicalBookBadge, medicalBookBadgeStyle(medStatus)]}>
                        <Text
                          style={[
                            styles.medicalBookBadgeText,
                            medicalBookBadgeTextStyle(medStatus),
                          ]}>
                          {t(`medicalBook.status.${medStatus}`, {
                            date: profile.medicalBookExpiresOn
                              ? formatDisplayDate(profile.medicalBookExpiresOn)
                              : '',
                          })}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()
            )}
          </View>

          <View style={styles.section} onLayout={handleSectionLayout('workExperience')}>
            <View style={styles.workExpHeader}>
              <Text style={styles.sectionTitle}>{t('barista.workExperience.title')}</Text>
              {(profile.workExperiences ?? []).length > 0 &&
                (() => {
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

            {isEditing ? (
              <WorkExperienceEditor
                experiences={workExperienceDrafts}
                onChange={next => {
                  setWorkExperienceDrafts(next);
                  if (workExperienceErrors.length > 0) setWorkExperienceErrors([]);
                }}
                disabled={isSaving}
                errorsByIndex={workExperienceErrors}
              />
            ) : (
              <WorkExperienceList experiences={profile.workExperiences ?? []} />
            )}
          </View>

          <View style={styles.section} onLayout={handleSectionLayout('preferences')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('baristaProfileScreen.workPreferences', {
                  defaultValue: 'Предпочтения по работе',
                })}
              </Text>
            </View>

            {isEditing ? (
              <>
                <Text style={styles.label}>
                  {t('baristaProfileScreen.preferredMetro', {
                    defaultValue: 'Предпочитаемые станции метро',
                  })}
                </Text>
                <MetroSelector
                  multiSelect
                  city={city}
                  onCityChange={nextCity => {
                    setCity(nextCity);
                    setPreferredMetroStations([]);
                  }}
                  value={preferredMetroStations}
                  onChange={setPreferredMetroStations}
                  userLocation={userLocation}
                />

                <Text style={styles.label}>
                  {t('baristaProfileScreen.preferredShiftTimes', {
                    defaultValue: 'Предпочитаемые смены',
                  })}
                </Text>
                <View style={styles.chipsContainer}>
                  {SHIFT_TIME_KEYS.map(({ value, labelKey }) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.chip,
                        selectedShiftTimes.includes(value) && styles.chipSelected,
                      ]}
                      onPress={() => toggleShiftTime(value)}>
                      <Text
                        style={[
                          styles.chipText,
                          selectedShiftTimes.includes(value) && styles.chipTextSelected,
                        ]}>
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>
                  {t('baristaProfileScreen.hourlyRateMin', {
                    defaultValue: 'Минимальная ставка в час (RUB)',
                  })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={hourlyRateMin}
                  onChangeText={text =>
                    setHourlyRateMin(sanitizeDigitsInput(text, COMPENSATION_MAX_DIGITS))
                  }
                  maxLength={COMPENSATION_MAX_DIGITS}
                  keyboardType="numeric"
                  placeholder={t('baristaSetup.minPlaceholder', { defaultValue: 'Мин' })}
                  editable={isEditing}
                  returnKeyType="done"
                />
              </>
            ) : (
              (() => {
                const hasMetro = profile.preferredMetroStations.length > 0;
                const hasShifts = profile.preferredShiftTimes.length > 0;
                const hasRate = profile.hourlyRateMin != null;
                if (!hasMetro && !hasShifts && !hasRate) {
                  return <Text style={styles.emptySection}>{t('common.notSpecified')}</Text>;
                }
                return (
                  <>
                    {hasMetro && (
                      <>
                        <Text style={styles.label}>
                          {t('baristaProfileScreen.metroStations', {
                            defaultValue: 'Станции метро',
                          })}
                        </Text>
                        <Text style={styles.infoText}>
                          {isMetroAnySelection(profile.preferredMetroStations)
                            ? t('metro.anyOptionTitle', { defaultValue: 'Любая станция' })
                            : profile.preferredMetroStations.join(', ')}
                        </Text>
                      </>
                    )}
                    {hasShifts && (
                      <>
                        <Text style={styles.label}>
                          {t('baristaProfileScreen.shiftTimes', { defaultValue: 'Смены' })}
                        </Text>
                        <View style={styles.chipsContainer}>
                          {profile.preferredShiftTimes.map(shift => {
                            const entry = SHIFT_TIME_KEYS.find(s => s.value === shift);
                            return (
                              <View key={shift} style={[styles.chip, styles.chipSelected]}>
                                <Text style={[styles.chipText, styles.chipTextSelected]}>
                                  {entry ? t(entry.labelKey) : shift}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                    {hasRate && (
                      <>
                        <Text style={styles.label}>
                          {t('baristaProfileScreen.hourlyRate', { defaultValue: 'Ставка в час' })}
                        </Text>
                        <Text style={styles.infoText}>
                          {t('baristaProfileScreen.hourlyRateFromValue', {
                            defaultValue: 'от {{min}} RUB',
                            min: profile.hourlyRateMin,
                          })}
                        </Text>
                      </>
                    )}
                  </>
                );
              })()
            )}
          </View>

          <View style={styles.section} onLayout={handleSectionLayout('portfolio')}>
            <View style={styles.portfolioHeader}>
              <Text style={styles.sectionTitle}>
                {t('baristaProfileScreen.portfolio', { defaultValue: 'Портфолио' })}
              </Text>
              <Text style={styles.portfolioCounter}>
                {t('portfolioPhotos.counter', {
                  count: profile.portfolioPhotos.length,
                  max: PHOTO_LIMIT,
                })}
              </Text>
            </View>

            {profile.portfolioPhotos.length > 0 ? (
              <View style={styles.portfolioGrid}>
                {profile.portfolioPhotos.map((photo, index) => (
                  <View key={index} style={styles.portfolioItem}>
                    <TouchableOpacity
                      onPress={() => openViewer(profile.portfolioPhotos, index)}
                      accessibilityLabel={t('baristaProfileScreen.viewPortfolioPhotoA11y', {
                        index: index + 1,
                        defaultValue: 'Открыть фото портфолио {{index}}',
                      })}>
                      <FastImage
                        source={{ uri: transformedImageUrl(photo, 100) }}
                        style={styles.portfolioPhoto}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.portfolioRemoveButton}
                      onPress={() => handleRemovePortfolioPhoto(photo)}
                      disabled={isSaving}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('baristaProfileScreen.removePhotoA11y', {
                        defaultValue: 'Удалить фото',
                      })}>
                      <Text style={styles.portfolioRemoveButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {t('baristaProfileScreen.noPortfolioPhotos', {
                  defaultValue: 'Фото портфолио пока нет',
                })}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.uploadButton,
                profile.portfolioPhotos.length >= PHOTO_LIMIT && styles.uploadButtonDisabled,
              ]}
              onPress={handlePortfolioPhotoUpload}
              disabled={isSaving || profile.portfolioPhotos.length >= PHOTO_LIMIT}>
              <Text style={styles.uploadButtonText}>
                {isSaving
                  ? t('baristaProfileScreen.uploading', { defaultValue: 'Загрузка…' })
                  : t('baristaProfileScreen.addPortfolioPhoto', {
                      defaultValue: '+ Добавить фото в портфолио',
                    })}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsActivelyLooking(!isActivelyLooking)}>
                <Text style={styles.toggleLabel}>
                  {t('baristaProfileScreen.actively', { defaultValue: 'Активно ищу работу' })}
                </Text>
                <View style={[styles.toggleSwitch, isActivelyLooking && styles.toggleSwitchActive]}>
                  <View
                    style={[styles.toggleThumb, isActivelyLooking && styles.toggleThumbActive]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
  skeletonRoot: {
    padding: 20,
  },
  skeletonHero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  skeletonGap: {
    marginTop: 6,
  },
  skeletonGapBig: {
    marginTop: 14,
  },
  skeletonBlock: {
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.pill,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
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
    alignItems: 'center',
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
  avatarUploadButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  avatarUploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  city: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  completenessContainer: {
    marginTop: 12,
  },
  completenessBar: {
    height: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completenessBarFill: {
    height: '100%',
  },
  completenessText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  missingContainer: {
    marginTop: 8,
  },
  missingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  missingItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  // Floating pencil button at the top-right of the profile header card.
  // Replaces the old "Изменить" text link that lived next to a "Личная
  // информация" heading — heading is gone, so the affordance moves up to the
  // card it actually edits.
  editPencilButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 6,
  },
  // Sits at the top of the personal-info section when isEditing is true,
  // hosting Cancel + Save side-by-side over the form fields.
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    maxHeight: 180,
  },
  bioText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptySection: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  certificationItem: {
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  separator: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  portfolioItem: {
    position: 'relative',
  },
  portfolioPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  portfolioRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioRemoveButtonText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  workExpHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.success,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    marginLeft: 20,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePickerPlaceholder: {
    color: COLORS.textSecondary,
  },
  datePickerDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  medicalBookHelper: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  medicalBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicalBookButton: {
    flex: 1,
  },
  medicalBookClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  medicalBookClearText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
  medicalBookDisplay: {
    marginTop: 8,
  },
  medicalBookBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  medicalBookBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginTop: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioCounter: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyRowSecondary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Used by the "subsections of Личная информация" rows (Shift history,
  // Reviews, Reliability). No internal divider — the rows are visually
  // grouped under the section heading and spacing alone separates them.
  subsectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  historyRowLeft: {
    flex: 1,
  },
  historyRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  historyRowSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historyRowChevron: {
    fontSize: 26,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
});
