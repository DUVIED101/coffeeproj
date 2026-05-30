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
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { AuthService } from '../../services/AuthService';
import { PasswordInput } from '../../components/PasswordInput';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getEmailError, getPasswordError, MAX_PASSWORD_LENGTH } from '../../utils/validation';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
  route: RouteProp<AuthStackParamList, 'Signup'>;
};

export const SignupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { accountType } = route.params;

  const translateValidationError = (key: string | null): string | null => {
    if (!key) return null;
    if (key === 'auth.errors.passwordTooLong') return t(key, { max: MAX_PASSWORD_LENGTH });
    return t(key);
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    const emailErr = translateValidationError(getEmailError(email));
    setEmailError(emailErr);
    if (emailErr) isValid = false;

    const passwordErr = translateValidationError(getPasswordError(password));
    setPasswordError(passwordErr);
    if (passwordErr) isValid = false;

    if (password !== confirmPassword) {
      setConfirmPasswordError(t('auth.signup.passwordsDoNotMatch'));
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (accountType === 'business') {
      navigation.navigate('EmployerSubtype', {
        email: normalizedEmail,
        password,
      });
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signUpWithEmail(normalizedEmail, password, 'barista');
      navigation.navigate('EmailVerification', {
        email: normalizedEmail,
        accountType: 'barista',
      });
    } catch (error: unknown) {
      console.error('Signup error:', error);

      const message = getErrorMessage(error);

      if (message === 'email_already_registered' || message.includes('already registered')) {
        setEmailError(t('auth.signup.errorEmailTaken'));
        return;
      }
      if (message.includes('Invalid email')) {
        setEmailError(t('auth.signup.errorInvalidEmail'));
        return;
      }
      const errorMessage = message.includes('Password') ? message : t('auth.signup.errorGeneric');
      Alert.alert(t('auth.signup.failedTitle'), errorMessage, [{ text: t('common.ok') }]);
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('auth.common.back')}
            style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.signup.title')}</Text>
            <Text style={styles.subtitle}>
              {accountType === 'barista'
                ? t('auth.signup.subtitleBarista')
                : t('auth.signup.subtitleBusiness')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.signup.emailLabel')}</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setEmailError(null);
                }}
                placeholder={t('auth.signup.emailPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.signup.passwordLabel')}</Text>
              <PasswordInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordError(null);
                }}
                placeholder={t('auth.signup.passwordPlaceholder')}
                hasError={!!passwordError}
              />
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              <Text style={styles.hint}>{t('auth.signup.passwordHint')}</Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.signup.confirmPasswordLabel')}</Text>
              <PasswordInput
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  setConfirmPasswordError(null);
                }}
                placeholder={t('auth.signup.passwordPlaceholder')}
                hasError={!!confirmPasswordError}
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
                <Text style={styles.buttonText}>
                  {accountType === 'business' ? t('auth.signup.ctaContinue') : t('auth.signup.cta')}
                </Text>
              )}
            </TouchableOpacity>

            <SocialAuthButtons accountType={accountType} separatorLabel={t('auth.social.or')} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.signup.haveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>{t('auth.signup.loginLink')}</Text>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backArrow: {
    fontSize: 36,
    lineHeight: 36,
    color: COLORS.text,
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
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
