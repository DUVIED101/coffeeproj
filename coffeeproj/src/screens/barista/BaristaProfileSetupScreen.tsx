import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, EQUIPMENT_TYPES } from '../../config/constants';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { WorkExperienceService } from '../../services/WorkExperienceService';
import { MetroSelector } from '../../components/MetroSelector';
import { CityToggle } from '../../components/CityToggle';
import { CertificatesEditor } from '../../components/CertificatesEditor';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { WorkExperienceEditor } from '../../components/WorkExperienceEditor';
import { useAuthStore } from '../../stores/authStore';
import { formatLocalDate } from '../../utils/dateUtils';
import { requestLocationPermission, getCurrentLocation } from '../../utils/geolocation';
import type { GeoPoint } from '../../types/business';
import type { ShiftTime, BaristaProfile } from '../../types/baristaProfile';
import type { CityCode } from '../../types/city';
import { DEFAULT_CITY, toCityCode } from '../../types/city';
import type { BaristaProfileId } from '../../types/ids';
import type { WorkExperienceDraft } from '../../types/workExperience';

type BaristaStackParamList = {
  JobFeed: undefined;
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'BaristaProfileSetup'>;
};

const STEP_KEYS = [
  'baristaSetup.stepBasicInfo',
  'baristaSetup.stepProfessional',
  'baristaSetup.stepPreferences',
  'baristaSetup.stepPortfolio',
  'baristaSetup.stepWorkExperience',
] as const;

const SHIFT_TIME_KEYS: { value: ShiftTime; labelKey: string }[] = [
  { value: 'morning', labelKey: 'shiftTimes.morningRange' },
  { value: 'afternoon', labelKey: 'shiftTimes.afternoonRange' },
  { value: 'evening', labelKey: 'shiftTimes.eveningRange' },
  { value: 'night', labelKey: 'shiftTimes.nightRange' },
];

export const BaristaProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const user = useAuthStore(state => state.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<BaristaProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState<CityCode>(DEFAULT_CITY);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2000, 0, 1));

  const [bio, setBio] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  const [preferredMetroStations, setPreferredMetroStations] = useState<string[]>([]);
  const [selectedShiftTimes, setSelectedShiftTimes] = useState<ShiftTime[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState('');
  const [hourlyRateMax, setHourlyRateMax] = useState('');

  const [workExperiences, setWorkExperiences] = useState<WorkExperienceDraft[]>([]);

  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(undefined);

  useEffect(() => {
    loadExistingProfile();
    initializeLocation();
  }, []);

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

  const loadExistingProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await BaristaProfileService.getProfileByUserId(user.id);

      if (profile) {
        setExistingProfile(profile);
        // Pre-fill all fields
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setCity(toCityCode(profile.city));
        setDateOfBirth(profile.dateOfBirth || '');
        if (profile.dateOfBirth) {
          setSelectedDate(new Date(profile.dateOfBirth));
        }
        setBio(profile.bio || '');
        setYearsOfExperience(profile.yearsOfExperience?.toString() || '');
        setSelectedEquipment(profile.equipmentExperience);
        setCertifications(profile.certifications);
        setPreferredMetroStations(profile.preferredMetroStations);
        setSelectedShiftTimes(profile.preferredShiftTimes);
        setHourlyRateMin(profile.hourlyRateMin?.toString() || '');
        setHourlyRateMax(profile.hourlyRateMax?.toString() || '');

        const existingExperiences = await WorkExperienceService.listForProfile(
          profile.id as BaristaProfileId
        );
        setWorkExperiences(
          existingExperiences.map(e => ({
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
      }
    } catch (error) {
      console.error('Error loading existing profile:', error);
    } finally {
      setIsLoading(false);
    }
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

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return t('baristaSetup.selectDate', { defaultValue: 'Выберите дату' });
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert(
          t('baristaSetup.validationTitle', { defaultValue: 'Проверьте данные' }),
          t('baristaSetup.validationRequired', {
            defaultValue: 'Заполните все обязательные поля',
          })
        );
        return false;
      }
    }
    return true;
  };

  const handleCityChange = useCallback((nextCity: CityCode) => {
    setCity(nextCity);
    setPreferredMetroStations([]);
  }, []);

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (currentStep < STEP_KEYS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert(
        t('baristaSetup.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaSetup.errorNotAuthenticated', { defaultValue: 'Пользователь не авторизован' })
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city,
        dateOfBirth: dateOfBirth.trim() || undefined,
        bio: bio.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
        equipmentExperience: selectedEquipment,
        certifications,
        languages: ['Russian'],
        preferredMetroStations,
        preferredShiftTimes: selectedShiftTimes,
        hourlyRateMin: hourlyRateMin ? parseInt(hourlyRateMin, 10) : undefined,
        hourlyRateMax: hourlyRateMax ? parseInt(hourlyRateMax, 10) : undefined,
      };

      let profileId: BaristaProfileId;
      if (existingProfile) {
        const updated = await BaristaProfileService.updateProfile(user.id, profileData);
        profileId = updated.id as BaristaProfileId;
      } else {
        const created = await BaristaProfileService.createProfile({
          userId: user.id,
          ...profileData,
        });
        profileId = created.id as BaristaProfileId;
      }

      await WorkExperienceService.replaceAll(profileId, workExperiences);

      Alert.alert(
        t('baristaSetup.successTitle', { defaultValue: 'Готово' }),
        existingProfile
          ? t('baristaSetup.successUpdated', { defaultValue: 'Профиль успешно обновлён!' })
          : t('baristaSetup.successCreated', { defaultValue: 'Профиль успешно создан!' }),
        [
          {
            text: t('common.ok', { defaultValue: 'ОК' }),
            onPress: () => navigation.replace('BaristaProfile'),
          },
        ]
      );
    } catch (error: unknown) {
      console.error('Error creating profile:', error);
      Alert.alert(
        t('baristaSetup.errorTitle', { defaultValue: 'Ошибка' }),
        t('baristaSetup.errorCreate', {
          defaultValue: 'Не удалось создать профиль. Попробуйте ещё раз.',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsLabels = STEP_KEYS.map(key => t(key));

  const renderProgressIndicator = () => (
    <ProgressIndicator steps={stepsLabels} currentStep={currentStep} />
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('baristaSetup.step1Title', { defaultValue: 'Основная информация' })}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t('baristaSetup.step1Subtitle', { defaultValue: 'Расскажите о себе' })}
            </Text>

            <Text style={styles.label}>
              {t('baristaSetup.fieldFirstName', { defaultValue: 'Имя' })}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('baristaSetup.fieldFirstNamePlaceholder', {
                defaultValue: 'Введите имя',
              })}
              placeholderTextColor={COLORS.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>
              {t('baristaSetup.fieldLastName', { defaultValue: 'Фамилия' })}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('baristaSetup.fieldLastNamePlaceholder', {
                defaultValue: 'Введите фамилию',
              })}
              placeholderTextColor={COLORS.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.label}>
              {t('baristaSetup.fieldCity', { defaultValue: 'Город' })}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <CityToggle value={city} onChange={handleCityChange} />

            <Text style={styles.label}>
              {t('baristaSetup.fieldDateOfBirth', {
                defaultValue: 'Дата рождения (опционально)',
              })}
            </Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.datePickerText, !dateOfBirth && styles.datePickerPlaceholder]}>
                {dateOfBirth
                  ? formatDisplayDate(dateOfBirth)
                  : t('baristaSetup.selectDate', { defaultValue: 'Выберите дату' })}
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
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                />
                <TouchableOpacity
                  style={styles.datePickerDoneButton}
                  onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>
                    {t('baristaSetup.done', { defaultValue: 'Готово' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('baristaSetup.step2Title', { defaultValue: 'Профессиональная информация' })}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t('baristaSetup.step2Subtitle', {
                defaultValue: 'Покажите свой опыт в кофейной индустрии',
              })}
            </Text>

            <Text style={styles.label}>
              {t('baristaSetup.fieldBio', { defaultValue: 'О себе (опционально)' })}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('baristaSetup.fieldBioPlaceholder', {
                defaultValue: 'Расскажите работодателям о своей страсти к кофе…',
              })}
              placeholderTextColor={COLORS.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {t('baristaSetup.fieldBioCounter', {
                count: bio.length,
                defaultValue: '{{count}}/500',
              })}
            </Text>

            <Text style={styles.label}>
              {t('baristaSetup.fieldYearsExperience', {
                defaultValue: 'Стаж в годах (опционально)',
              })}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('baristaSetup.fieldYearsExperiencePlaceholder', {
                defaultValue: '0-50',
              })}
              placeholderTextColor={COLORS.textSecondary}
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <Text style={styles.label}>
              {t('baristaSetup.fieldEquipment', {
                defaultValue: 'Опыт работы с оборудованием (опционально)',
              })}
            </Text>
            <View style={styles.chipsContainer}>
              {EQUIPMENT_TYPES.map(equipment => (
                <TouchableOpacity
                  key={equipment}
                  style={[
                    styles.chip,
                    selectedEquipment.includes(equipment) && styles.chipSelected,
                  ]}
                  onPress={() => toggleEquipment(equipment)}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedEquipment.includes(equipment) && styles.chipTextSelected,
                    ]}>
                    {equipment}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('baristaSetup.step3Title', { defaultValue: 'Предпочтения по работе' })}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t('baristaSetup.step3Subtitle', {
                defaultValue: 'Это поможет подбирать подходящие вакансии',
              })}
            </Text>

            <Text style={styles.label}>
              {t('baristaSetup.fieldMetro', {
                defaultValue: 'Предпочитаемые станции метро (опционально)',
              })}
            </Text>
            <MetroSelector
              multiSelect
              city={city}
              onCityChange={handleCityChange}
              value={preferredMetroStations}
              onChange={setPreferredMetroStations}
              userLocation={userLocation}
            />

            <Text style={styles.label}>
              {t('baristaSetup.fieldShiftTimes', {
                defaultValue: 'Предпочитаемые смены (опционально)',
              })}
            </Text>
            <View style={styles.chipsContainer}>
              {SHIFT_TIME_KEYS.map(({ value, labelKey }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, selectedShiftTimes.includes(value) && styles.chipSelected]}
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
              {t('baristaSetup.fieldHourlyRange', {
                defaultValue: 'Желаемая ставка в час (RUB, опционально)',
              })}
            </Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('baristaSetup.minPlaceholder', { defaultValue: 'Мин' })}
                placeholderTextColor={COLORS.textSecondary}
                value={hourlyRateMin}
                onChangeText={setHourlyRateMin}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.separator}>-</Text>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('baristaSetup.maxPlaceholder', { defaultValue: 'Макс' })}
                placeholderTextColor={COLORS.textSecondary}
                value={hourlyRateMax}
                onChangeText={setHourlyRateMax}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('baristaSetup.step4Title', { defaultValue: 'Портфолио' })}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t('baristaSetup.step4Subtitle', {
                defaultValue: 'Добавьте сертификаты (опционально)',
              })}
            </Text>

            <CertificatesEditor
              certificates={certifications}
              isBusy={isSubmitting}
              onAdd={async name => {
                const next = [...certifications, name];
                setCertifications(next);
                if (existingProfile && user?.id) {
                  try {
                    await BaristaProfileService.setCertifications(user.id, next);
                  } catch (error: unknown) {
                    console.error('Error saving certificate:', error);
                    setCertifications(certifications);
                    Alert.alert(
                      t('baristaSetup.errorTitle', { defaultValue: 'Ошибка' }),
                      t('baristaSetup.errorSaveCert', {
                        defaultValue: 'Не удалось сохранить сертификат.',
                      })
                    );
                  }
                }
              }}
              onRemove={async cert => {
                const next = certifications.filter(c => c !== cert);
                setCertifications(next);
                if (existingProfile && user?.id) {
                  try {
                    await BaristaProfileService.setCertifications(user.id, next);
                  } catch (error: unknown) {
                    console.error('Error removing certificate:', error);
                    setCertifications(certifications);
                    Alert.alert(
                      t('baristaSetup.errorTitle', { defaultValue: 'Ошибка' }),
                      t('baristaSetup.errorRemoveCert', {
                        defaultValue: 'Не удалось удалить сертификат.',
                      })
                    );
                  }
                }
              }}
            />
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('baristaSetup.step5Title', { defaultValue: 'Опыт работы' })}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t('baristaSetup.step5Subtitle', {
                defaultValue: 'Укажите места, где вы работали (опционально)',
              })}
            </Text>

            <WorkExperienceEditor
              experiences={workExperiences}
              onChange={setWorkExperiences}
              disabled={isSubmitting}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {t('baristaSetup.loadingProfile', { defaultValue: 'Загрузка профиля…' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {existingProfile
            ? t('baristaSetup.editTitle', { defaultValue: 'Редактирование профиля' })
            : t('baristaSetup.createTitle', { defaultValue: 'Создание профиля' })}
        </Text>
        <Text style={styles.headerSubtitle}>
          {existingProfile
            ? t('baristaSetup.editSubtitle', { defaultValue: 'Обновите свою информацию' })
            : t('baristaSetup.createSubtitle', {
                defaultValue: 'Заполните профиль, чтобы получать больше подходящих вакансий',
              })}
        </Text>
      </View>

      {renderProgressIndicator()}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>{renderStepContent()}</View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>
                {t('baristaSetup.back', { defaultValue: 'Назад' })}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === STEP_KEYS.length - 1
                  ? t('baristaSetup.finish', { defaultValue: 'Готово' })
                  : t('baristaSetup.next', { defaultValue: 'Далее' })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: COLORS.error,
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
  textArea: {
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
