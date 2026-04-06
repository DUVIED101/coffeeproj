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
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import type { AccountType } from '../../types';
import { AuthService } from '../../services/AuthService';
import { useAuthStore } from '../../stores/authStore';
import {
  getEmailError,
  getPasswordError,
  getPhoneError,
  normalizePhone,
} from '../../utils/validation';

type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
  route: RouteProp<AuthStackParamList, 'Signup'>;
};

export const SignupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountType } = route.params;
  const { setSession, setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    const emailErr = getEmailError(email);
    setEmailError(emailErr);
    if (emailErr) isValid = false;

    // Validate password
    const passwordErr = getPasswordError(password);
    setPasswordError(passwordErr);
    if (passwordErr) isValid = false;

    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    // Validate phone (optional)
    if (phoneNumber) {
      const phoneErr = getPhoneError(phoneNumber);
      setPhoneError(phoneErr);
      if (phoneErr) isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = phoneNumber ? normalizePhone(phoneNumber) : undefined;

      const { user, profile } = await AuthService.signUpWithEmail(
        email.trim().toLowerCase(),
        password,
        accountType,
        normalizedPhone
      );

      console.log('Signup successful:', user.id);

      // Auth state will be updated automatically by authStore listener
      setUser(profile);

      // Show success message based on account type
      if (accountType === 'barista') {
        Alert.alert(
          'Account Created',
          'Your account has been created! Complete your profile to start applying for jobs.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Account Created', 'Your account has been created successfully!', [
          { text: 'OK' },
        ]);
      }
    } catch (error: any) {
      console.error('Signup error:', error);

      let errorMessage = 'Failed to create account. Please try again.';

      if (error.message) {
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Password')) {
          errorMessage = error.message;
        }
      }

      Alert.alert('Signup Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up as {accountType === 'barista' ? 'a Barista' : 'a Business'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setEmailError(null);
                }}
                placeholder="your.email@example.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, phoneError ? styles.inputError : null]}
                value={phoneNumber}
                onChangeText={text => {
                  setPhoneNumber(text);
                  setPhoneError(null);
                }}
                placeholder="+7 (XXX) XXX-XX-XX"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
              {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null]}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              <Text style={styles.hint}>
                At least 8 characters, 1 uppercase, 1 lowercase, 1 number
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  setConfirmPasswordError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />
              {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Log In</Text>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
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
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  optional: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
