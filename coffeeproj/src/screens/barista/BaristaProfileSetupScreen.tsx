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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, EQUIPMENT_TYPES } from '../../config/constants';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { MetroSelector } from '../../components/MetroSelector';
import { useAuthStore } from '../../stores/authStore';
import type { ShiftTime, BaristaProfile } from '../../types/baristaProfile';

type BaristaStackParamList = {
  JobFeed: undefined;
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'BaristaProfileSetup'>;
};

const STEPS = ['Basic Info', 'Professional', 'Preferences', 'Portfolio'];
const SHIFT_TIMES: { value: ShiftTime; label: string }[] = [
  { value: 'morning', label: 'Morning (6AM-12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM-6PM)' },
  { value: 'evening', label: 'Evening (6PM-12AM)' },
  { value: 'night', label: 'Night (12AM-6AM)' },
];

export const BaristaProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore(state => state.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<BaristaProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
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

  useEffect(() => {
    loadExistingProfile();
  }, []);

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
        setCity(profile.city);
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
      const formattedDate = date.toISOString().split('T')[0];
      setDateOfBirth(formattedDate);
    }
  }, []);

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      if (!firstName.trim() || !lastName.trim() || !city.trim()) {
        Alert.alert('Validation Error', 'Please fill in all required fields');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (currentStep < STEPS.length - 1) {
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

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup',
      'Your profile will be incomplete and employers may not consider your applications. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => navigation.replace('JobFeed'),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);

      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim(),
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

      if (existingProfile) {
        // Update existing profile
        await BaristaProfileService.updateProfile(user.id, profileData);
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.replace('BaristaProfile'),
          },
        ]);
      } else {
        // Create new profile
        await BaristaProfileService.createProfile({
          userId: user.id,
          ...profileData,
        });
        Alert.alert('Success', 'Profile created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.replace('BaristaProfile'),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.progressStep}>
          <View
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
              index < currentStep && styles.progressDotCompleted,
            ]}>
            <Text
              style={[
                styles.progressDotText,
                index <= currentStep && styles.progressDotTextActive,
              ]}>
              {index + 1}
            </Text>
          </View>
          {index < STEPS.length - 1 && (
            <View style={[styles.progressLine, index < currentStep && styles.progressLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor={COLORS.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>
              Last Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor={COLORS.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.label}>
              City <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Moscow, St. Petersburg, etc."
              placeholderTextColor={COLORS.textSecondary}
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Date of Birth (optional)</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.datePickerText, !dateOfBirth && styles.datePickerPlaceholder]}>
                {dateOfBirth ? formatDisplayDate(dateOfBirth) : 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onValueChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                />
                <TouchableOpacity
                  style={styles.datePickerDoneButton}
                  onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Professional Information</Text>
            <Text style={styles.stepSubtitle}>Showcase your coffee expertise</Text>

            <Text style={styles.label}>Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell employers about your passion for coffee..."
              placeholderTextColor={COLORS.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{bio.length}/500</Text>

            <Text style={styles.label}>Years of Experience (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0-50"
              placeholderTextColor={COLORS.textSecondary}
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Equipment Experience (optional)</Text>
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
            <Text style={styles.stepTitle}>Work Preferences</Text>
            <Text style={styles.stepSubtitle}>Help us match you with the right jobs</Text>

            <Text style={styles.label}>Preferred Metro Stations (optional)</Text>
            <MetroSelector
              value={preferredMetroStations}
              onChange={value => setPreferredMetroStations(Array.isArray(value) ? value : [value])}
              multiSelect={true}
            />

            <Text style={styles.label}>Preferred Shift Times (optional)</Text>
            <View style={styles.chipsContainer}>
              {SHIFT_TIMES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, selectedShiftTimes.includes(value) && styles.chipSelected]}
                  onPress={() => toggleShiftTime(value)}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedShiftTimes.includes(value) && styles.chipTextSelected,
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hourly Rate Range (RUB, optional)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Min"
                placeholderTextColor={COLORS.textSecondary}
                value={hourlyRateMin}
                onChangeText={setHourlyRateMin}
                keyboardType="numeric"
              />
              <Text style={styles.separator}>-</Text>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Max"
                placeholderTextColor={COLORS.textSecondary}
                value={hourlyRateMax}
                onChangeText={setHourlyRateMax}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Portfolio</Text>
            <Text style={styles.stepSubtitle}>Add photos and avatar (optional)</Text>

            <Text style={styles.infoText}>
              You can upload photos and avatar after creating your profile.
            </Text>
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
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {existingProfile ? 'Edit Your Profile' : 'Create Your Profile'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {existingProfile
            ? 'Update your information'
            : 'Complete your profile to get better job matches'}
        </Text>
      </View>

      {renderProgressIndicator()}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: COLORS.success,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 20,
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
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
