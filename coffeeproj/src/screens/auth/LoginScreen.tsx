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
import { COLORS } from '../../config/constants';
import { AuthService } from '../../services/AuthService';
import { PasswordInput } from '../../components/PasswordInput';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { getEmailError } from '../../utils/validation';
import { getErrorMessage } from '../../utils/getErrorMessage';

type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: any };
  Login: undefined;
  PasswordReset: { email: string };
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    const emailErr = getEmailError(email);
    setEmailError(emailErr);
    if (emailErr) isValid = false;

    // Validate password (just check if not empty for login)
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError(null);
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { session, user } = await AuthService.signInWithEmail(
        email.trim().toLowerCase(),
        password
      );

      console.log('Login successful:', user.id);

      // Auth state will be updated automatically by authStore listener
    } catch (error: unknown) {
      console.error('Login error:', error);

      const message = getErrorMessage(error);
      let errorMessage = 'Failed to log in. Please try again.';

      if (message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before logging in.';
      } else if (message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      }

      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter Email', 'Please enter your email address to reset your password.', [
        { text: 'OK' },
      ]);
      return;
    }

    const emailErr = getEmailError(email);
    if (emailErr) {
      Alert.alert('Invalid Email', emailErr, [{ text: 'OK' }]);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      await AuthService.resetPassword(normalizedEmail);

      Alert.alert(
        'Код отправлен',
        'Мы выслали 6-значный код на вашу почту. Введите его на следующем экране.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PasswordReset', { email: normalizedEmail }),
          },
        ]
      );
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      const message = getErrorMessage(error);
      const isRateLimit = /rate|limit|too many/i.test(message);
      Alert.alert(
        isRateLimit ? 'Слишком часто' : 'Ошибка',
        isRateLimit
          ? 'Превышен лимит запросов. Подождите несколько минут и попробуйте снова.'
          : message,
        [{ text: 'OK' }]
      );
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Log in to your account</Text>
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

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <PasswordInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordError(null);
                }}
                placeholder="••••••••"
                hasError={!!passwordError}
              />
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <SocialAuthButtons separatorLabel="или" />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AccountType')}>
              <Text style={styles.linkText}>Sign Up</Text>
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
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 40,
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
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
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
    marginTop: 'auto',
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
