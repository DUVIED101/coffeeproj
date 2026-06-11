import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, EQUIPMENT_TYPES, RADII, SHOW_PLATFORM_FEE } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import { showErrorToast } from '../../stores/errorToastStore';
import { handleApiError } from '../../utils/handleApiError';
import type { Branch, Equipment } from '../../types/business';
import type { JobType, CompensationType, ShiftDetails, WeekdayKey } from '../../types/job';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import type { MainTabsParamList } from '../../navigation/MainTabs';
import {
  sanitizeDigitsInput,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
  COMPENSATION_MAX_DIGITS,
} from '../../utils/validation';
import { clampToEffectiveLength } from '../../utils/textLength';
import { jobMinDate, jobMaxDate, clampDate } from '../../utils/dateRanges';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'CreateJob' | 'EditJob'>;
  route: RouteProp<BusinessStackParamList, 'CreateJob' | 'EditJob'>;
};

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const parseTimeString = (time: string): Date => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const EQUIPMENT_OPTIONS: readonly Equipment[] = EQUIPMENT_TYPES;

const TAG_OPTIONS = ['urgent', 'flexible', 'training-provided'];

const WEEKDAY_KEYS: readonly WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

const HOURS_PER_WEEK_MIN = 1;
const HOURS_PER_WEEK_MAX = 80;

// Allows digits + a single dot with one fractional digit, e.g. "37", "37.5".
// Integer part is capped at two digits so users can't type past the 0-80 range
// (validate() still enforces the upper bound on submit).
// Empty string and a bare trailing dot are intermediate states the user may
// type while editing, so we accept them and let `validate()` reject on submit.
const sanitizeHoursPerWeekInput = (input: string): string => {
  const cleaned = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned.slice(0, 2);
  const intPart = cleaned.slice(0, firstDot).slice(0, 2);
  const fracPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, 1);
  return `${intPart}.${fracPart}`;
};

export const CreateJobScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const editJobId =
    route.name === 'EditJob'
      ? (route.params as BusinessStackParamList['EditJob'] | undefined)?.jobId
      : undefined;
  const isEditMode = !!editJobId;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingJob, setIsLoadingJob] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const [jobType, setJobType] = useState<JobType>('temporary');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [preferredDayIdxs, setPreferredDayIdxs] = useState<number[]>([]);
  const [compensationType, setCompensationType] = useState<CompensationType>('hourly');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? t('createJob.titleEdit') : t('createJob.titleCreate'),
    });
  }, [navigation, isEditMode, t]);

  useEffect(() => {
    if (!editJobId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const job = await JobService.getJobById(editJobId);
        if (cancelled || !job) {
          if (!cancelled && !job) {
            showErrorToast(t('createJob.errors.jobNotFound'));
            navigation.goBack();
          }
          return;
        }
        if (job.status !== 'open') {
          showErrorToast(t('createJob.errors.onlyOpenEditable'));
          navigation.goBack();
          return;
        }
        setJobType(job.jobType);
        setSelectedBranchId(job.branchId);
        setTitle(job.title);
        setDescription(job.description ?? '');
        setRequirements(job.requirements.length > 0 ? job.requirements : ['']);
        setSelectedEquipment(job.requiredEquipmentExperience);
        // Defensive clamp: legacy rows may carry dates outside [today, 2050]
        // which break the native picker. Stay within the supported window.
        const loadedStart = clampDate(
          new Date(job.shiftDetails.startDate),
          jobMinDate(),
          jobMaxDate()
        );
        setStartDate(loadedStart);
        if (job.shiftDetails.kind === 'permanent') {
          setHoursPerWeek(String(job.shiftDetails.hoursPerWeek));
          setPreferredDayIdxs(
            (job.shiftDetails.preferredDays ?? [])
              .map(day => WEEKDAY_KEYS.indexOf(day))
              .filter(idx => idx >= 0)
          );
        } else {
          setEndDate(
            job.shiftDetails.endDate
              ? clampDate(new Date(job.shiftDetails.endDate), loadedStart, jobMaxDate())
              : undefined
          );
          setStartTime(parseTimeString(job.shiftDetails.startTime));
          setEndTime(parseTimeString(job.shiftDetails.endTime));
          setIsRecurring(job.shiftDetails.isRecurring);
          if (job.shiftDetails.recurringDays) {
            setSelectedDays(
              job.shiftDetails.recurringDays
                .map(day => DAY_NAMES.indexOf(day))
                .filter(idx => idx >= 0)
            );
          }
        }
        setCompensationType(job.jobType === 'permanent' ? 'hourly' : job.compensation.type);
        setCompensationAmount(String(job.compensation.amount));
        setSelectedTags(job.tags ?? []);
      } catch (err) {
        console.error('Error loading job for edit:', err);
        if (!cancelled) {
          void handleApiError(err);
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setIsLoadingJob(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [editJobId, navigation, t]);

  const loadBranches = async () => {
    if (!user?.id) return;

    try {
      const business = await BusinessService.getBusinessByOwnerId(user.id);
      if (business) {
        setBusinessId(business.id);
        const branchesData = await BusinessService.getBranches(business.id);
        setBranches(branchesData);
        if (branchesData.length === 1) {
          setSelectedBranchId(branchesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      void handleApiError(error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // In create mode, mirror the selected branch's equipment into the job by
  // default. The user can still deselect/add chips after — this just removes
  // the busywork of re-entering equipment the branch already has. Edit mode
  // is left alone so we don't clobber a previously saved job's equipment.
  useEffect(() => {
    if (isEditMode) return;
    if (!selectedBranchId) return;
    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return;
    setSelectedEquipment(branch.equipment);
  }, [selectedBranchId, branches, isEditMode]);

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const togglePreferredDay = (dayIndex: number) => {
    setPreferredDayIdxs(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Supports night shifts: if end <= start, assume next-day end.
  // Equal times are treated as invalid (caller should validate).
  const calculateTotalHours = (): number => {
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    if (startMinutes === endMinutes) return 0;
    const diff = endMinutes - startMinutes;
    return (diff > 0 ? diff : diff + 1440) / 60;
  };

  const payment = useMemo(() => {
    const amount = parseFloat(compensationAmount) || 0;

    if (compensationType === 'hourly') {
      // Permanent positions don't have a fixed per-shift duration, so hourly
      // pay totals the weekly hours commitment instead of a single-shift span.
      const totalHours =
        jobType === 'permanent' ? parseFloat(hoursPerWeek) || 0 : calculateTotalHours();
      const totalAmount = amount * totalHours;
      const platformFee = totalAmount * 0.15;
      const totalWithFee = totalAmount + platformFee;

      return { totalHours, totalAmount, platformFee, totalWithFee };
    }
    const totalAmount = amount;
    const platformFee = totalAmount * 0.15;
    const totalWithFee = totalAmount + platformFee;

    return { totalHours: 0, totalAmount, platformFee, totalWithFee };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compensationAmount, compensationType, startTime, endTime, jobType, hoursPerWeek]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedBranchId) {
      newErrors.branch = t('createJob.errors.branchRequired');
    }
    if (!title.trim()) {
      newErrors.title = t('createJob.errors.titleRequired');
    }
    if (!compensationAmount || parseFloat(compensationAmount) <= 0) {
      newErrors.compensation = t('createJob.errors.compensationRequired');
    }
    const minStart = jobMinDate();
    const maxEnd = jobMaxDate();
    if (startDate.getTime() < minStart.getTime()) {
      newErrors.startDate = t('createJob.errors.startDateInPast');
    } else if (startDate.getTime() > maxEnd.getTime()) {
      newErrors.startDate = t('createJob.errors.startDateTooFar');
    }

    if (jobType === 'permanent') {
      const hours = parseFloat(hoursPerWeek);
      if (
        !hoursPerWeek ||
        Number.isNaN(hours) ||
        hours < HOURS_PER_WEEK_MIN ||
        hours > HOURS_PER_WEEK_MAX
      ) {
        newErrors.hoursPerWeek = t('createJob.errors.hoursPerWeekInvalid', {
          min: HOURS_PER_WEEK_MIN,
          max: HOURS_PER_WEEK_MAX,
        });
      }
    } else {
      if (isRecurring && selectedDays.length === 0) {
        newErrors.recurringDays = t('createJob.errors.recurringDaysRequired');
      }
      if (endDate && endDate.getTime() > maxEnd.getTime()) {
        newErrors.endDate = t('createJob.errors.endDateTooFar');
      }
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      // Within a single day (no endDate or endDate == startDate) the end time must
      // come strictly after the start. Multi-day shifts can have end < start because
      // the end falls on the next calendar day.
      const isSingleDay =
        !endDate ||
        (endDate.getFullYear() === startDate.getFullYear() &&
          endDate.getMonth() === startDate.getMonth() &&
          endDate.getDate() === startDate.getDate());
      if (isSingleDay && endMinutes <= startMinutes) {
        newErrors.endTime = t('createJob.errors.endTimeDiffersFromStart');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) return;
    if (!validate()) {
      Alert.alert(t('createJob.errors.validationTitle'), t('createJob.errors.validationBody'));
      return;
    }

    if (!user?.id) {
      showErrorToast(t('createJob.errors.userNotAuthenticated'));
      return;
    }

    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const business = await BusinessService.getBusinessByOwnerId(user.id);
      if (!business) {
        throw new Error(t('createJob.errors.businessNotFound'));
      }

      const selectedBranch = branches.find(b => b.id === selectedBranchId);
      if (!selectedBranch) {
        throw new Error(t('createJob.errors.branchNotFound'));
      }

      const filteredRequirements = requirements.filter(r => r.trim() !== '');

      const shiftDetails: ShiftDetails =
        jobType === 'permanent'
          ? {
              kind: 'permanent',
              startDate: startDate.toISOString(),
              hoursPerWeek: parseFloat(hoursPerWeek),
              preferredDays:
                preferredDayIdxs.length > 0
                  ? preferredDayIdxs.map(idx => WEEKDAY_KEYS[idx])
                  : undefined,
            }
          : {
              kind: 'temporary',
              startDate: startDate.toISOString(),
              endDate: endDate ? endDate.toISOString() : undefined,
              startTime: formatTime(startTime),
              endTime: formatTime(endTime),
              isRecurring,
              recurringDays: isRecurring ? selectedDays.map(index => DAY_NAMES[index]) : undefined,
            };

      const jobData = {
        businessId: business.id,
        businessOwnerId: user.id,
        branchId: selectedBranchId,
        jobType,
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: filteredRequirements,
        requiredEquipmentExperience: selectedEquipment,
        location: {
          address: selectedBranch.address,
          city: selectedBranch.city,
          coordinates: selectedBranch.coordinates,
          metroStation: selectedBranch.metroStation,
        },
        shiftDetails,
        compensation: {
          type: compensationType,
          amount: parseFloat(compensationAmount),
          currency: 'RUB',
        },
        payment: {
          hourlyRate: compensationType === 'hourly' ? parseFloat(compensationAmount) : undefined,
          totalHours: compensationType === 'hourly' ? payment.totalHours : undefined,
          totalAmount: payment.totalAmount,
          platformFee: payment.platformFee,
          totalWithFee: payment.totalWithFee,
        },
        tags: selectedTags,
      };

      if (editJobId) {
        const { businessId: _b, businessOwnerId: _o, ...updatePayload } = jobData;
        await JobService.updateJob(editJobId, updatePayload, user.id);
        Alert.alert(t('common.success'), t('createJob.updatedSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        await JobService.createJob(jobData);
        Alert.alert(t('common.success'), t('createJob.createdSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error(editJobId ? 'Error updating job:' : 'Error creating job:', error);
      void handleApiError(error);
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  };

  if (isLoadingBranches || isLoadingJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (branches.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('createJob.branchesEmptyTitle')}</Text>
          <Text style={styles.emptySubtext}>{t('createJob.branchesEmptySubtitle')}</Text>
          <TouchableOpacity
            style={[styles.emptyCta, !businessId && styles.saveButtonDisabled]}
            onPress={() => {
              if (!businessId) return;
              const parent =
                navigation.getParent<BottomTabNavigationProp<MainTabsParamList, 'Business'>>();
              parent?.navigate('Profile', {
                screen: 'BranchManagement',
                params: { businessId },
              });
            }}
            disabled={!businessId}>
            <Text style={styles.emptyCtaText}>{t('branches.add')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createJob.sections.jobType')}</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, jobType === 'temporary' && styles.segmentButtonActive]}
              onPress={() => setJobType('temporary')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  jobType === 'temporary' && styles.segmentButtonTextActive,
                ]}>
                {t('createJob.jobType.temporary')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, jobType === 'permanent' && styles.segmentButtonActive]}
              onPress={() => {
                setJobType('permanent');
                setCompensationType('hourly');
              }}>
              <Text
                style={[
                  styles.segmentButtonText,
                  jobType === 'permanent' && styles.segmentButtonTextActive,
                ]}>
                {t('createJob.jobType.permanent')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {t('createJob.fields.branch')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.branchList}>
            {branches.map(branch => (
              <TouchableOpacity
                key={branch.id}
                style={[
                  styles.branchOption,
                  selectedBranchId === branch.id && styles.branchOptionSelected,
                ]}
                onPress={() => setSelectedBranchId(branch.id)}>
                <Text
                  style={[
                    styles.branchOptionText,
                    selectedBranchId === branch.id && styles.branchOptionTextSelected,
                  ]}>
                  {branch.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.branch && <Text style={styles.errorText}>{errors.branch}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {t('createJob.fields.title')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder={t('createJob.fields.titlePlaceholder')}
            value={title}
            onChangeText={text => {
              setTitle(text);
              const { title: _, ...rest } = errors;
              setErrors(rest);
            }}
            maxLength={TITLE_MAX_LENGTH}
            returnKeyType="done"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('createJob.fields.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('createJob.fields.descriptionPlaceholder')}
            value={description}
            onChangeText={text =>
              setDescription(clampToEffectiveLength(text, DESCRIPTION_MAX_LENGTH))
            }
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('createJob.fields.requirements')}</Text>
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementRow}>
              <TextInput
                style={[styles.input, styles.requirementInput]}
                placeholder={t('createJob.fields.requirementPlaceholder', { index: index + 1 })}
                value={requirement}
                onChangeText={text => updateRequirement(index, text)}
                maxLength={SHORT_TEXT_MAX_LENGTH}
                returnKeyType="done"
              />
              {requirements.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeRequirement(index)}>
                  <Text style={styles.removeButtonText}>
                    {t('createJob.fields.removeRequirement')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addRequirement}>
            <Text style={styles.addButtonText}>{t('createJob.fields.addRequirement')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('createJob.fields.equipment')}</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_OPTIONS.map(equipment => (
              <TouchableOpacity
                key={equipment}
                style={[
                  styles.equipmentChip,
                  selectedEquipment.includes(equipment) && styles.equipmentChipSelected,
                ]}
                onPress={() => toggleEquipment(equipment)}>
                <Text
                  style={[
                    styles.equipmentChipText,
                    selectedEquipment.includes(equipment) && styles.equipmentChipTextSelected,
                  ]}>
                  {equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createJob.sections.shiftDetails')}</Text>

          <Text style={styles.label}>
            {jobType === 'permanent'
              ? t('createJob.fields.permanentStartDate')
              : t('createJob.fields.startDate')}{' '}
            <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <>
              <DateTimePicker
                value={clampDate(startDate, jobMinDate(), jobMaxDate())}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="light"
                textColor="#000000"
                minimumDate={jobMinDate()}
                maximumDate={jobMaxDate()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    const clamped = clampDate(selectedDate, jobMinDate(), jobMaxDate());
                    setStartDate(clamped);
                    if (endDate && endDate.getTime() < clamped.getTime()) {
                      setEndDate(undefined);
                    }
                    const { startDate: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowStartDatePicker(false)}>
                <Text style={styles.pickerDoneText}>{t('createJob.done')}</Text>
              </TouchableOpacity>
            </>
          )}
          {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}

          {jobType === 'permanent' ? (
            <>
              <Text style={styles.label}>
                {t('createJob.fields.hoursPerWeek')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.hoursPerWeek ? styles.inputError : null]}
                placeholder={t('createJob.fields.hoursPerWeekPlaceholder')}
                keyboardType="decimal-pad"
                value={hoursPerWeek}
                onChangeText={text => {
                  setHoursPerWeek(sanitizeHoursPerWeekInput(text));
                  const { hoursPerWeek: _, ...rest } = errors;
                  setErrors(rest);
                }}
                returnKeyType="done"
              />
              {errors.hoursPerWeek && <Text style={styles.errorText}>{errors.hoursPerWeek}</Text>}

              <Text style={styles.label}>{t('createJob.fields.preferredDays')}</Text>
              <Text style={styles.helperText}>{t('createJob.fields.preferredDaysHint')}</Text>
              <View style={styles.daysGrid}>
                {WEEKDAY_KEYS.map((dayKey, index) => (
                  <TouchableOpacity
                    key={dayKey}
                    style={[
                      styles.dayChip,
                      preferredDayIdxs.includes(index) && styles.dayChipSelected,
                    ]}
                    onPress={() => togglePreferredDay(index)}>
                    <Text
                      style={[
                        styles.dayChipText,
                        preferredDayIdxs.includes(index) && styles.dayChipTextSelected,
                      ]}>
                      {t(`createJob.weekdays.${dayKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('createJob.fields.endDate')}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {endDate ? formatDate(endDate) : t('createJob.fields.selectDate')}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <>
                  <DateTimePicker
                    value={clampDate(endDate ?? startDate, startDate, jobMaxDate())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    textColor="#000000"
                    minimumDate={startDate}
                    maximumDate={jobMaxDate()}
                    onChange={(_event, selectedDate) => {
                      if (selectedDate) {
                        setEndDate(clampDate(selectedDate, startDate, jobMaxDate()));
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.pickerDoneButton}
                    onPress={() => setShowEndDatePicker(false)}>
                    <Text style={styles.pickerDoneText}>{t('createJob.done')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <Text style={styles.label}>
                    {t('createJob.fields.startTime')} <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartTimePicker(true)}>
                    <Text style={styles.dateButtonText}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <>
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="light"
                        textColor="#000000"
                        onChange={(_event, selectedTime) => {
                          if (!selectedTime) return;
                          setStartTime(selectedTime);
                          const isSingleDay =
                            !endDate ||
                            (endDate.getFullYear() === startDate.getFullYear() &&
                              endDate.getMonth() === startDate.getMonth() &&
                              endDate.getDate() === startDate.getDate());
                          if (isSingleDay) {
                            const startMin =
                              selectedTime.getHours() * 60 + selectedTime.getMinutes();
                            const endMin = endTime.getHours() * 60 + endTime.getMinutes();
                            if (endMin <= startMin) {
                              const nextEnd = new Date(selectedTime);
                              const clampedMin = Math.min(startMin + 1, 23 * 60 + 59);
                              nextEnd.setHours(Math.floor(clampedMin / 60), clampedMin % 60, 0, 0);
                              setEndTime(nextEnd);
                            }
                          }
                          const { startTime: _, ...rest } = errors;
                          setErrors(rest);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowStartTimePicker(false)}>
                        <Text style={styles.pickerDoneText}>{t('createJob.done')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
                </View>

                <View style={styles.timeInput}>
                  <Text style={styles.label}>
                    {t('createJob.fields.endTime')} <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndTimePicker(true)}>
                    <Text style={styles.dateButtonText}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                  {showEndTimePicker && (
                    <>
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="light"
                        textColor="#000000"
                        onChange={(_event, selectedTime) => {
                          if (!selectedTime) return;
                          const isSingleDay =
                            !endDate ||
                            (endDate.getFullYear() === startDate.getFullYear() &&
                              endDate.getMonth() === startDate.getMonth() &&
                              endDate.getDate() === startDate.getDate());
                          const startMin = startTime.getHours() * 60 + startTime.getMinutes();
                          const pickedMin =
                            selectedTime.getHours() * 60 + selectedTime.getMinutes();
                          let next = selectedTime;
                          if (isSingleDay && pickedMin <= startMin) {
                            // Clamp to start + 1 min so the range stays positive.
                            next = new Date(selectedTime);
                            const clampedMin = Math.min(startMin + 1, 23 * 60 + 59);
                            next.setHours(Math.floor(clampedMin / 60), clampedMin % 60, 0, 0);
                          }
                          setEndTime(next);
                          const { endTime: _, ...rest } = errors;
                          setErrors(rest);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowEndTimePicker(false)}>
                        <Text style={styles.pickerDoneText}>{t('createJob.done')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {errors.endTime && <Text style={styles.errorText}>{errors.endTime}</Text>}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>{t('createJob.fields.isRecurring')}</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                />
              </View>

              {isRecurring && (
                <View>
                  <Text style={styles.label}>
                    {t('createJob.fields.recurringDays')} <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.daysGrid}>
                    {WEEKDAY_KEYS.map((dayKey, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dayChip,
                          selectedDays.includes(index) && styles.dayChipSelected,
                        ]}
                        onPress={() => toggleDay(index)}>
                        <Text
                          style={[
                            styles.dayChipText,
                            selectedDays.includes(index) && styles.dayChipTextSelected,
                          ]}>
                          {t(`createJob.weekdays.${dayKey}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.recurringDays && (
                    <Text style={styles.errorText}>{errors.recurringDays}</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createJob.sections.compensation')}</Text>

          <Text style={styles.label}>
            {t('createJob.fields.compensationType')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.compensationTypes}>
            {(jobType === 'permanent'
              ? (['hourly'] as CompensationType[])
              : (['hourly', 'daily', 'fixed'] as CompensationType[])
            ).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.compensationChip,
                  compensationType === type && styles.compensationChipSelected,
                ]}
                onPress={() => setCompensationType(type)}>
                <Text
                  style={[
                    styles.compensationChipText,
                    compensationType === type && styles.compensationChipTextSelected,
                  ]}>
                  {t(`createJob.compensationOption.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {t('createJob.fields.amountRub')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.compensation ? styles.inputError : null]}
            placeholder="0"
            keyboardType="numeric"
            value={compensationAmount}
            onChangeText={text => {
              setCompensationAmount(sanitizeDigitsInput(text, COMPENSATION_MAX_DIGITS));
              const { compensation: _, ...rest } = errors;
              setErrors(rest);
            }}
            maxLength={COMPENSATION_MAX_DIGITS}
            returnKeyType="done"
          />
          {errors.compensation && <Text style={styles.errorText}>{errors.compensation}</Text>}

          <View style={styles.paymentSummary}>
            <Text style={styles.sectionTitle}>{t('createJob.sections.paymentSummary')}</Text>
            {compensationType === 'hourly' && (
              <Text style={styles.paymentLine}>
                {t('createJob.paymentSummary.totalHours', { hours: payment.totalHours.toFixed(2) })}
              </Text>
            )}
            <Text style={styles.paymentLine}>
              {t('createJob.paymentSummary.totalAmount', {
                amount: payment.totalAmount.toFixed(2),
              })}
            </Text>
            {SHOW_PLATFORM_FEE && (
              <>
                <Text style={styles.paymentLine}>
                  {t('createJob.paymentSummary.platformFee', {
                    amount: payment.platformFee.toFixed(2),
                  })}
                </Text>
                <Text style={styles.paymentLineTotal}>
                  {t('createJob.paymentSummary.totalWithFee', {
                    amount: payment.totalWithFee.toFixed(2),
                  })}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('createJob.fields.tags')}</Text>
          <View style={styles.tagsGrid}>
            {TAG_OPTIONS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipSelected]}
                onPress={() => toggleTag(tag)}>
                <Text
                  style={[
                    styles.tagChipText,
                    selectedTags.includes(tag) && styles.tagChipTextSelected,
                  ]}>
                  {t(`createJob.tags.${tag}`, { defaultValue: tag })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? t('createJob.actionSave') : t('createJob.actionCreate')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.card,
    alignItems: 'center',
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 240,
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: RADII.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  segmentButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  branchList: {
    gap: 8,
  },
  branchOption: {
    padding: 12,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  branchOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  branchOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  branchOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.error,
    borderRadius: RADII.input,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  equipmentChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  equipmentChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  equipmentChipTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pickerDoneText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  dayChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  compensationTypes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  compensationChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  compensationChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  compensationChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  compensationChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADII.card,
  },
  paymentLine: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentLineTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  tagChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tagChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  tagChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    margin: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: RADII.pill,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
