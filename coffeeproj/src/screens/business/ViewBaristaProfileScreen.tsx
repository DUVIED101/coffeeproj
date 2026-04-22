import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { BaristaProfileService } from '../../services/BaristaProfileService';
import { ChatService } from '../../services/ChatService';
import { useAuthStore } from '../../stores/authStore';
import type { BaristaProfile, ShiftTime } from '../../types/baristaProfile';

type BusinessStackParamList = {
  ViewBaristaProfile: { baristaId: string };
  Chat: { applicationId?: string; conversationId?: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'ViewBaristaProfile'>;
  route: RouteProp<BusinessStackParamList, 'ViewBaristaProfile'>;
};

const SHIFT_TIMES: { value: ShiftTime; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

export const ViewBaristaProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { baristaId } = route.params;
  const currentUser = useAuthStore(state => state.user);

  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleStartConversation = useCallback(async () => {
    if (!currentUser?.id || !profile || isStartingConversation) return;

    setIsStartingConversation(true);
    try {
      const conversation = await ChatService.getOrCreateConversation(
        currentUser.id,
        profile.userId,
        null
      );
      navigation.navigate('Chat', { conversationId: conversation.id });
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      const message: string = error?.message ?? '';
      if (message.includes('Rate limit exceeded')) {
        Alert.alert('Ограничение', 'Слишком много новых диалогов за последний час.');
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть диалог. Попробуйте еще раз.');
      }
    } finally {
      setIsStartingConversation(false);
    }
  }, [currentUser?.id, profile, isStartingConversation, navigation]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await BaristaProfileService.getProfileByUserId(baristaId);

      if (!profileData) {
        Alert.alert('Error', 'Barista profile not found', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setProfile(profileData);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load barista profile', [
        { text: 'OK', onPress: () => navigation.goBack() },
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {profile.firstName[0]}
                  {profile.lastName[0]}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.city}>{profile.city}</Text>
            {profile.yearsOfExperience !== undefined && (
              <Text style={styles.experience}>{profile.yearsOfExperience} years of experience</Text>
            )}
          </View>
        </View>

        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {profile.equipmentExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Experience</Text>
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
            <Text style={styles.sectionTitle}>Certifications</Text>
            <View style={styles.chipsContainer}>
              {profile.certifications.map((cert, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.infoText}>{profile.languages.join(', ')}</Text>
          </View>
        )}

        {profile.preferredShiftTimes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Shift Times</Text>
            <View style={styles.chipsContainer}>
              {profile.preferredShiftTimes.map(shift => (
                <View key={shift} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {SHIFT_TIMES.find(s => s.value === shift)?.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.portfolioPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.portfolioGrid}>
              {profile.portfolioPhotos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.portfolioPhoto} />
              ))}
            </View>
          </View>
        )}

        {currentUser?.accountType === 'business' && profile.isActivelyLooking && (
          <View style={styles.messageButtonContainer}>
            <TouchableOpacity
              style={[styles.messageButton, isStartingConversation && styles.messageButtonDisabled]}
              onPress={handleStartConversation}
              disabled={isStartingConversation}
              activeOpacity={0.7}>
              {isStartingConversation ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.messageButtonText}>Написать</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.noteTitle}>Note</Text>
          <Text style={styles.noteText}>
            Contact information and rate expectations are only visible after accepting the
            application.
          </Text>
        </View>
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
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  messageButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  messageButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
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
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
