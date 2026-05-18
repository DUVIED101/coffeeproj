import React, { useState, useEffect, useMemo } from 'react';
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
import { COLORS, EQUIPMENT_TYPES, RADII } from '../../config/constants';
import { JobService } from '../../services/JobService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import type { Branch, Equipment } from '../../types/business';
import type { JobType, CompensationType } from '../../types/job';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import type { MainTabsParamList } from '../../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'CreateJob'>;
};

const EQUIPMENT_OPTIONS: readonly Equipment[] = EQUIPMENT_TYPES;

const TAG_OPTIONS = ['urgent', 'flexible', 'training-provided'];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CreateJobScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
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
  const [compensationType, setCompensationType] = useState<CompensationType>('hourly');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadBranches();
  }, []);

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
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setIsLoadingBranches(false);
    }
  };

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
      const totalHours = calculateTotalHours();
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
  }, [compensationAmount, compensationType, startTime, endTime]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedBranchId) {
      newErrors.branch = 'Branch is required';
    }
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!compensationAmount || parseFloat(compensationAmount) <= 0) {
      newErrors.compensation = 'Valid compensation amount is required';
    }
    if (isRecurring && selectedDays.length === 0) {
      newErrors.recurringDays = 'Select at least one day for recurring shifts';
    }
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    if (startMinutes === endMinutes) {
      newErrors.endTime = 'End time must differ from start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsSaving(true);

    try {
      const business = await BusinessService.getBusinessByOwnerId(user.id);
      if (!business) {
        throw new Error('Business not found');
      }

      const selectedBranch = branches.find(b => b.id === selectedBranchId);
      if (!selectedBranch) {
        throw new Error('Branch not found');
      }

      const dayNames = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      const recurringDays = isRecurring ? selectedDays.map(index => dayNames[index]) : undefined;

      const filteredRequirements = requirements.filter(r => r.trim() !== '');

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
        shiftDetails: {
          startDate: startDate.toISOString(),
          endDate: endDate ? endDate.toISOString() : undefined,
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          isRecurring,
          recurringDays,
        },
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

      await JobService.createJob(jobData);

      Alert.alert('Success', 'Job created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating job:', error);
      Alert.alert('Error', 'Failed to create job');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingBranches) {
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
          <Text style={styles.emptyText}>No branches found</Text>
          <Text style={styles.emptySubtext}>Please add a branch before creating a job</Text>
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
          <Text style={styles.sectionTitle}>Job Type</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, jobType === 'temporary' && styles.segmentButtonActive]}
              onPress={() => setJobType('temporary')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  jobType === 'temporary' && styles.segmentButtonTextActive,
                ]}>
                Temporary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, jobType === 'permanent' && styles.segmentButtonActive]}
              onPress={() => setJobType('permanent')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  jobType === 'permanent' && styles.segmentButtonTextActive,
                ]}>
                Permanent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Branch <Text style={styles.required}>*</Text>
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
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder="e.g. Experienced Barista"
            value={title}
            onChangeText={text => {
              setTitle(text);
              const { title: _, ...rest } = errors;
              setErrors(rest);
            }}
            returnKeyType="done"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Job description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Requirements</Text>
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementRow}>
              <TextInput
                style={[styles.input, styles.requirementInput]}
                placeholder={`Requirement ${index + 1}`}
                value={requirement}
                onChangeText={text => updateRequirement(index, text)}
                returnKeyType="done"
              />
              {requirements.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeRequirement(index)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addRequirement}>
            <Text style={styles.addButtonText}>+ Add Requirement</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Equipment Experience</Text>
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
          <Text style={styles.sectionTitle}>Shift Details</Text>

          <Text style={styles.label}>
            Start Date <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <>
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="light"
                textColor="#000000"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setStartDate(selectedDate);
                    const { startDate: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowStartDatePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
          {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}

          <Text style={styles.label}>End Date (Optional)</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
            <Text style={styles.dateButtonText}>
              {endDate ? formatDate(endDate) : 'Select date'}
            </Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <>
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="light"
                textColor="#000000"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowEndDatePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>
                Start Time <Text style={styles.required}>*</Text>
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
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    textColor="#000000"
                    onChange={(_event, selectedTime) => {
                      if (selectedTime) {
                        setStartTime(selectedTime);
                        const { startTime: _, ...rest } = errors;
                        setErrors(rest);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.pickerDoneButton}
                    onPress={() => setShowStartTimePicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
              {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
            </View>

            <View style={styles.timeInput}>
              <Text style={styles.label}>
                End Time <Text style={styles.required}>*</Text>
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
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    textColor="#000000"
                    onChange={(_event, selectedTime) => {
                      if (selectedTime) {
                        setEndTime(selectedTime);
                        const { endTime: _, ...rest } = errors;
                        setErrors(rest);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.pickerDoneButton}
                    onPress={() => setShowEndTimePicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
              {errors.endTime && <Text style={styles.errorText}>{errors.endTime}</Text>}
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Is Recurring</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          {isRecurring && (
            <View>
              <Text style={styles.label}>
                Recurring Days <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.daysGrid}>
                {WEEKDAYS.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayChip, selectedDays.includes(index) && styles.dayChipSelected]}
                    onPress={() => toggleDay(index)}>
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(index) && styles.dayChipTextSelected,
                      ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.recurringDays && <Text style={styles.errorText}>{errors.recurringDays}</Text>}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>

          <Text style={styles.label}>
            Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.compensationTypes}>
            {(['hourly', 'daily', 'fixed'] as CompensationType[]).map(type => (
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
                  {type === 'hourly' ? 'Hourly' : type === 'daily' ? 'Daily' : 'Fixed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            Amount (RUB) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.compensation ? styles.inputError : null]}
            placeholder="0"
            keyboardType="numeric"
            value={compensationAmount}
            onChangeText={text => {
              setCompensationAmount(text);
              const { compensation: _, ...rest } = errors;
              setErrors(rest);
            }}
            returnKeyType="done"
          />
          {errors.compensation && <Text style={styles.errorText}>{errors.compensation}</Text>}

          <View style={styles.paymentSummary}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            {compensationType === 'hourly' && (
              <Text style={styles.paymentLine}>Total Hours: {payment.totalHours.toFixed(2)}</Text>
            )}
            <Text style={styles.paymentLine}>Total Amount: ₽{payment.totalAmount.toFixed(2)}</Text>
            <Text style={styles.paymentLine}>
              Platform Fee (15%): ₽{payment.platformFee.toFixed(2)}
            </Text>
            <Text style={styles.paymentLineTotal}>
              Total With Fee: ₽{payment.totalWithFee.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tags</Text>
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
                  {tag}
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
            <Text style={styles.saveButtonText}>Create Job</Text>
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
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
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
