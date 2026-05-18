import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, EQUIPMENT_TYPES } from '../../config/constants';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { ReviewService } from '../../services/ReviewService';
import { MetroSelector } from '../../components/MetroSelector';
import { StarRow } from '../../components/StarRow';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import { CertificatesEditor } from '../../components/CertificatesEditor';
import { useAuthStore } from '../../stores/authStore';
import { formatLocalDate } from '../../utils/dateUtils';
import { computeProfileCompleteness } from '../../utils/profileCompleteness';
import type { BaristaProfile, ShiftTime } from '../../types/baristaProfile';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'BaristaProfile'>;
};

const SHIFT_TIMES: { value: ShiftTime; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

const getCompletenessColor = (completeness: number): string => {
  if (completeness < 50) return COLORS.error;
  if (completeness < 80) return COLORS.warning;
  return COLORS.success;
};

export const BaristaProfileScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore(state => state.user);
  const { t } = useTranslation();

  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [preferredMetroStations, setPreferredMetroStations] = useState<string[]>([]);
  const [selectedShiftTimes, setSelectedShiftTimes] = useState<ShiftTime[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState('');
  const [hourlyRateMax, setHourlyRateMax] = useState('');
  const [isActivelyLooking, setIsActivelyLooking] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2000, 0, 1));
  const [aggregate, setAggregate] = useState<UserReviewAggregate | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  useEffect(() => {
    loadProfile();
    loadAggregate();
  }, []);

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
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      const profileData = await BaristaProfileService.getProfileByUserId(user.id);

      if (!profileData) {
        navigation.replace('BaristaProfileSetup');
        return;
      }

      setProfile(profileData);
      populateFields(profileData);
    } catch (error: unknown) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const populateFields = (profileData: BaristaProfile) => {
    setFirstName(profileData.firstName);
    setLastName(profileData.lastName);
    setCity(profileData.city);
    setDateOfBirth(profileData.dateOfBirth || '');
    if (profileData.dateOfBirth) {
      setSelectedDate(new Date(profileData.dateOfBirth));
    }
    setBio(profileData.bio || '');
    setYearsOfExperience(
      profileData.yearsOfExperience !== undefined ? String(profileData.yearsOfExperience) : ''
    );
    setSelectedEquipment(profileData.equipmentExperience);
    setCertifications(profileData.certifications);
    setPreferredMetroStations(profileData.preferredMetroStations);
    setSelectedShiftTimes(profileData.preferredShiftTimes);
    setHourlyRateMin(
      profileData.hourlyRateMin !== undefined ? String(profileData.hourlyRateMin) : ''
    );
    setHourlyRateMax(
      profileData.hourlyRateMax !== undefined ? String(profileData.hourlyRateMax) : ''
    );
    setIsActivelyLooking(profileData.isActivelyLooking);
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
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAvatarUpload = async () => {
    if (!user?.id) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      setIsSaving(true);
      await BaristaProfileService.uploadAvatar(user.id, result.assets[0].uri);
      await loadProfile();
      Alert.alert('Success', 'Avatar uploaded successfully!');
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
      Alert.alert('Error', 'Failed to save certificate. Please try again.');
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
      Alert.alert('Error', 'Failed to remove certificate.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePortfolioPhotoUpload = async () => {
    if (!user?.id) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      setIsSaving(true);
      await BaristaProfileService.uploadPortfolioPhoto(user.id, result.assets[0].uri);
      await loadProfile();
      Alert.alert('Success', 'Portfolio photo uploaded successfully!');
    } catch (error: unknown) {
      console.error('Error uploading portfolio photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      populateFields(profile);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsSaving(true);

      const updatedProfile = await BaristaProfileService.updateProfile(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        bio: bio.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
        equipmentExperience: selectedEquipment,
        certifications,
        preferredMetroStations,
        preferredShiftTimes: selectedShiftTimes,
        hourlyRateMin: hourlyRateMin ? parseInt(hourlyRateMin, 10) : undefined,
        hourlyRateMax: hourlyRateMax ? parseInt(hourlyRateMax, 10) : undefined,
        isActivelyLooking,
      });

      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
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

  const completeness = computeProfileCompleteness(profile);
  const completenessColor = getCompletenessColor(completeness.percent);
  const missingItems = completeness.items.filter(item => !item.satisfied);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
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
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <TouchableOpacity
                  onPress={() => openViewer([profile.avatarUrl as string], 0)}
                  accessibilityLabel="View avatar fullscreen">
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
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
                onPress={handleAvatarUpload}
                disabled={isSaving}>
                <Text style={styles.avatarUploadButtonText}>
                  {profile.avatarUrl ? 'Change' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.name}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.city}>{profile.city}</Text>

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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Info</Text>
              {!isEditing ? (
                <TouchableOpacity onPress={handleEdit}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={handleCancel}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    <Text style={styles.saveButton}>{isSaving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditing ? (
              <>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={isEditing}
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={isEditing}
                />

                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  editable={isEditing}
                />

                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}>
                  <Text
                    style={[styles.datePickerText, !dateOfBirth && styles.datePickerPlaceholder]}>
                    {dateOfBirth ? formatDisplayDate(dateOfBirth) : 'Select date'}
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
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <>
                {profile.dateOfBirth && (
                  <Text style={styles.infoText}>Born: {profile.dateOfBirth}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.historyRow}
              onPress={() => navigation.navigate('ShiftHistory')}>
              <View style={styles.historyRowLeft}>
                <Text style={styles.historyRowTitle}>История смен</Text>
              </View>
              <Text style={styles.historyRowChevron}>›</Text>
            </TouchableOpacity>

            {user?.id && (
              <TouchableOpacity
                style={[styles.historyRow, styles.historyRowSecondary]}
                onPress={() => navigation.navigate('UserReviews', { userId: user.id as string })}>
                <View style={styles.historyRowLeft}>
                  <Text style={styles.historyRowTitle}>Все отзывы</Text>
                  {aggregate && aggregate.reviewCount > 0 ? (
                    <StarRow
                      rating={aggregate.averageRating}
                      count={aggregate.reviewCount}
                      showValue
                      size={14}
                    />
                  ) : (
                    <Text style={styles.historyRowSubtitle}>Без оценок</Text>
                  )}
                </View>
                <Text style={styles.historyRowChevron}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Info</Text>

            {isEditing ? (
              <>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  editable={isEditing}
                />

                <Text style={styles.label}>Years of Experience</Text>
                <TextInput
                  style={styles.input}
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  keyboardType="numeric"
                  editable={isEditing}
                  returnKeyType="done"
                />

                <Text style={styles.label}>Equipment Experience</Text>
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

                <Text style={styles.label}>Certifications</Text>
                <CertificatesEditor
                  certificates={profile?.certifications ?? certifications}
                  isBusy={isSaving}
                  onAdd={handleAddCertificate}
                  onRemove={handleRemoveCertificate}
                />
              </>
            ) : (
              <>
                {profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
                {profile.yearsOfExperience !== undefined && (
                  <Text style={styles.infoText}>Experience: {profile.yearsOfExperience} years</Text>
                )}
                {profile.equipmentExperience.length > 0 && (
                  <>
                    <Text style={styles.label}>Equipment</Text>
                    <View style={styles.chipsContainer}>
                      {profile.equipmentExperience.map(equipment => (
                        <View key={equipment} style={[styles.chip, styles.chipSelected]}>
                          <Text style={[styles.chipText, styles.chipTextSelected]}>
                            {equipment}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {profile.certifications.length > 0 && (
                  <>
                    <Text style={styles.label}>Certifications</Text>
                    {profile.certifications.map((cert, index) => (
                      <Text key={`${index}-${cert}`} style={styles.certificationItem}>
                        {index + 1}. {cert}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Preferences</Text>

            {isEditing ? (
              <>
                <Text style={styles.label}>Preferred Metro Stations</Text>
                <MetroSelector
                  multiSelect
                  value={preferredMetroStations}
                  onChange={setPreferredMetroStations}
                />

                <Text style={styles.label}>Preferred Shift Times</Text>
                <View style={styles.chipsContainer}>
                  {SHIFT_TIMES.map(({ value, label }) => (
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
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Hourly Rate Range (RUB)</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={hourlyRateMin}
                    onChangeText={setHourlyRateMin}
                    keyboardType="numeric"
                    placeholder="Min"
                    editable={isEditing}
                    returnKeyType="done"
                  />
                  <Text style={styles.separator}>-</Text>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={hourlyRateMax}
                    onChangeText={setHourlyRateMax}
                    keyboardType="numeric"
                    placeholder="Max"
                    editable={isEditing}
                    returnKeyType="done"
                  />
                </View>
              </>
            ) : (
              <>
                {profile.preferredMetroStations.length > 0 && (
                  <>
                    <Text style={styles.label}>Metro Stations</Text>
                    <Text style={styles.infoText}>{profile.preferredMetroStations.join(', ')}</Text>
                  </>
                )}
                {profile.preferredShiftTimes.length > 0 && (
                  <>
                    <Text style={styles.label}>Shift Times</Text>
                    <View style={styles.chipsContainer}>
                      {profile.preferredShiftTimes.map(shift => (
                        <View key={shift} style={[styles.chip, styles.chipSelected]}>
                          <Text style={[styles.chipText, styles.chipTextSelected]}>
                            {SHIFT_TIMES.find(s => s.value === shift)?.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {(profile.hourlyRateMin || profile.hourlyRateMax) && (
                  <>
                    <Text style={styles.label}>Hourly Rate</Text>
                    <Text style={styles.infoText}>
                      {profile.hourlyRateMin && `${profile.hourlyRateMin} RUB`}
                      {profile.hourlyRateMin && profile.hourlyRateMax && ' - '}
                      {profile.hourlyRateMax && `${profile.hourlyRateMax} RUB`}
                    </Text>
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>

            {profile.portfolioPhotos.length > 0 ? (
              <View style={styles.portfolioGrid}>
                {profile.portfolioPhotos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => openViewer(profile.portfolioPhotos, index)}
                    accessibilityLabel={`View portfolio photo ${index + 1}`}>
                    <Image source={{ uri: photo }} style={styles.portfolioPhoto} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No portfolio photos yet</Text>
            )}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePortfolioPhotoUpload}
              disabled={isSaving}>
              <Text style={styles.uploadButtonText}>
                {isSaving ? 'Uploading...' : '+ Add Portfolio Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsActivelyLooking(!isActivelyLooking)}>
                <Text style={styles.toggleLabel}>Actively Looking for Work</Text>
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
  portfolioPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
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
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
