import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import type { BusinessType } from '../../types';
import type { MainTabsParamList } from '../../navigation/MainTabs';

type BusinessStackParamList = {
  CreateBusiness: undefined;
  BusinessHome: { businessId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'CreateBusiness'>;
};

export const CreateBusinessScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('singleLocation');
  const [isLoading, setIsLoading] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Business name is required');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Business name must be at least 2 characters');
      isValid = false;
    } else {
      setNameError(null);
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      const existing = await BusinessService.getBusinessByOwnerId(user.id);
      if (existing) {
        navigation.replace('BusinessHome', { businessId: existing.id });
        return;
      }

      const business = await BusinessService.createBusiness({
        ownerId: user.id,
        name: name.trim(),
        description: description.trim() || undefined,
        businessType,
      });

      Alert.alert('Success', 'Business profile created successfully', [
        {
          text: 'OK',
          onPress: () => {
            const parent =
              navigation.getParent<BottomTabNavigationProp<MainTabsParamList, 'Business'>>();
            parent?.navigate('Profile', {
              screen: 'BranchManagement',
              params: { businessId: business.id },
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating business:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create business profile'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title}>Create Business Profile</Text>
            <Text style={styles.subtitle}>Set up your business profile to start posting jobs</Text>

            {/* Business Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Business Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="e.g. Surf Coffee Moscow"
                value={name}
                onChangeText={text => {
                  setName(text);
                  setNameError(null);
                }}
                editable={!isLoading}
                autoCapitalize="words"
                returnKeyType="done"
              />
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your business..."
                value={description}
                onChangeText={setDescription}
                editable={!isLoading}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Business Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Business Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('singleLocation')}
                  disabled={isLoading}>
                  <View style={styles.radioButton}>
                    {businessType === 'singleLocation' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>Single Location</Text>
                    <Text style={styles.radioDescription}>One coffee shop or location</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('multiLocation')}
                  disabled={isLoading}>
                  <View style={styles.radioButton}>
                    {businessType === 'multiLocation' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>Multiple Locations</Text>
                    <Text style={styles.radioDescription}>Chain or multiple branches</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Business Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
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
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
