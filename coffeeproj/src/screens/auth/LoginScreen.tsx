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
import { COLORS } from '../../config/constants';
import { AuthService } from '../../services/AuthService';
import { PasswordInput } from '../../components/PasswordInput';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
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
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;

    const emailErrKey = getEmailError(email);
    setEmailError(emailErrKey ? t(emailErrKey) : null);
    if (emailErrKey) isValid = false;

    if (!password) {
      setPasswordError(t('auth.login.passwordRequired'));
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
      const { user } = await AuthService.signInWithEmail(email.trim().toLowerCase(), password);

      console.log('Login successful:', user.id);

      // Auth state will be updated automatically by authStore listener
    } catch (error: unknown) {
      console.error('Login error:', error);

      const message = getErrorMessage(error);
      let errorMessage = t('auth.login.errorGeneric');

      if (message.includes('Invalid login credentials')) {
        errorMessage = t('auth.login.errorInvalidCredentials');
      } else if (message.includes('Email not confirmed')) {
        errorMessage = t('auth.login.errorEmailNotConfirmed');
      } else if (message.includes('Invalid email')) {
        errorMessage = t('auth.errors.emailInvalid');
      }

      Alert.alert(t('auth.login.failedTitle'), errorMessage, [{ text: t('common.ok') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('auth.login.enterEmailTitle'), t('auth.login.enterEmailBody'), [
        { text: t('common.ok') },
      ]);
      return;
    }

    const emailErrKey = getEmailError(email);
    if (emailErrKey) {
      Alert.alert(t('auth.errors.emailInvalid'), t(emailErrKey), [{ text: t('common.ok') }]);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      await AuthService.resetPassword(normalizedEmail);

      Alert.alert(t('auth.login.codeSentTitle'), t('auth.login.codeSentBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.navigate('PasswordReset', { email: normalizedEmail }),
        },
      ]);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      const message = getErrorMessage(error);
      const isRateLimit = /rate|limit|too many/i.test(message);
      Alert.alert(
        isRateLimit ? t('auth.login.tooManyAttemptsTitle') : t('common.error'),
        isRateLimit ? t('auth.login.tooManyAttemptsBody') : message,
        [{ text: t('common.ok') }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ResponsiveContainer maxWidth={480}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('auth.login.title')}</Text>
              <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.login.emailLabel')}</Text>
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    setEmailError(null);
                  }}
                  placeholder={t('auth.login.emailPlaceholder')}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.login.passwordLabel')}</Text>
                <PasswordInput
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  hasError={!!passwordError}
                />
                {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
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
                  <Text style={styles.buttonText}>{t('auth.login.cta')}</Text>
                )}
              </TouchableOpacity>

              <SocialAuthButtons separatorLabel={t('auth.social.or')} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.login.noAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AccountType')}>
                <Text style={styles.linkText}>{t('auth.login.signupLink')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ResponsiveContainer>
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
