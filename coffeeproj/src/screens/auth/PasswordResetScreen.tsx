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
import { getErrorMessage } from '../../utils/getErrorMessage';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { showErrorToast } from '../../stores/errorToastStore';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'PasswordReset'>;
  route: RouteProp<AuthStackParamList, 'PasswordReset'>;
};

const CODE_LENGTH = 6;

export const PasswordResetScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert(
        t('auth.passwordReset.invalidCodeTitle'),
        t('auth.passwordReset.invalidCodeBody', { count: CODE_LENGTH })
      );
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(
        t('auth.passwordReset.weakPasswordTitle'),
        t('auth.passwordReset.weakPasswordBody')
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('auth.passwordReset.mismatchTitle'), t('auth.passwordReset.mismatchBody'));
      return;
    }

    setIsSubmitting(true);
    try {
      await AuthService.verifyPasswordResetOtp(email, code.trim());
      await AuthService.updatePassword(newPassword);
      await AuthService.signOut();
      Alert.alert(t('auth.passwordReset.successTitle'), t('auth.passwordReset.successBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert(t('auth.passwordReset.errorTitle'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setIsResending(true);
    try {
      await AuthService.resetPassword(email);
      Alert.alert(t('auth.passwordReset.codeResentTitle'), t('auth.passwordReset.codeResentBody'));
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error));
    } finally {
      setIsResending(false);
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

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.passwordReset.title')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.passwordReset.subtitle', { count: CODE_LENGTH, email })}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.passwordReset.codeLabel')}</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                placeholder={t('auth.passwordReset.codePlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                textContentType="oneTimeCode"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.passwordReset.newPasswordLabel')}</Text>
              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.passwordReset.confirmPasswordLabel')}</Text>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}>
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>{t('auth.passwordReset.submit')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending}
              style={styles.resendWrap}>
              <Text style={styles.resendText}>
                {isResending ? t('auth.passwordReset.resending') : t('auth.passwordReset.resend')}
              </Text>
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
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
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
    fontSize: 18,
    letterSpacing: 4,
    color: COLORS.text,
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
  resendWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
