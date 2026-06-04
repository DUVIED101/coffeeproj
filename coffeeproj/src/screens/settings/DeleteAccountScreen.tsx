import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { AuthService } from '../../services/AuthService';
import { BusinessService } from '../../services/BusinessService';
import { JobService } from '../../services/JobService';
import { hasPasswordAuth, isAppleOnlyUser } from '../../utils/authProvider';

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const session = useAuthStore(s => s.session);
  const deleteAccount = useAuthStore(s => s.deleteAccount);

  // Apple SIWA users get a dedicated re-auth path because the privaterelay
  // alias can't receive our deletion OTP mail. Everyone else without a real
  // password (Yandex, Google) goes through OTP — see authProvider helpers.
  const hasEmailLogin = useMemo(() => hasPasswordAuth(session), [session]);
  const isAppleOnly = useMemo(() => isAppleOnlyUser(session), [session]);

  const expectedKeyword = t('settings.delete.confirmKeyword');

  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [appleIdToken, setAppleIdToken] = useState<string | null>(null);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [isReauthingApple, setIsReauthingApple] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async () => {
    if (isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      await AuthService.requestDeletionOtp();
      setOtpSent(true);
    } catch (err) {
      setOtpError(t('settings.delete.otpSendFailed'));
      console.error('requestDeletionOtp failed:', err);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleAppleReauth = async () => {
    if (isReauthingApple) return;
    setIsReauthingApple(true);
    setAppleError(null);
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL],
      });
      if (!response.identityToken) {
        throw new Error('apple_no_identity_token');
      }
      setAppleIdToken(response.identityToken);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === appleAuth.Error.CANCELED) {
        setIsReauthingApple(false);
        return;
      }
      console.error('Apple re-auth failed:', err);
      setAppleError(t('settings.delete.appleReauthFailed'));
    } finally {
      setIsReauthingApple(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.delete.title') });
  }, [navigation, t]);

  useEffect(() => {
    let cancelled = false;
    const checkActiveJobs = async () => {
      if (!user || user.accountType !== 'business') return;
      try {
        const business = await BusinessService.getBusinessByOwnerId(user.id);
        if (!business) return;
        const jobs = await JobService.getJobsByBusinessId(business.id);
        const active = jobs.filter(
          job => job.status === 'open' || job.status === 'in_review'
        ).length;
        if (!cancelled) setActiveJobsCount(active);
      } catch (err) {
        console.error('Error in DeleteAccountScreen.checkActiveJobs:', err);
      }
    };
    checkActiveJobs();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const keywordMatches = confirmText === expectedKeyword;
  const needsForce = activeJobsCount > 0;
  const credentialPresent = hasEmailLogin
    ? password.length > 0
    : isAppleOnly
      ? appleIdToken !== null
      : otpCode.length === 6;
  const canSubmit =
    keywordMatches && credentialPresent && (!needsForce || forceConfirmed) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setPasswordError(null);
    setOtpError(null);
    setAppleError(null);
    try {
      const force = needsForce ? true : undefined;
      if (hasEmailLogin) {
        await deleteAccount({ password, force });
      } else if (isAppleOnly && appleIdToken) {
        await deleteAccount({ appleIdToken, force });
      } else {
        await deleteAccount({ otpCode: otpCode.trim(), force });
      }
    } catch (err) {
      const message = (err as Error).message ?? '';
      const setCredentialError = (text: string) => {
        if (hasEmailLogin) setPasswordError(text);
        else if (isAppleOnly) setAppleError(text);
        else setOtpError(text);
      };
      if (message === 'invalid_password') {
        setPasswordError(t('settings.delete.invalidPassword'));
      } else if (message === 'invalid_otp') {
        setOtpError(t('settings.delete.invalidOtp'));
      } else if (message === 'invalid_apple_token') {
        setAppleIdToken(null);
        setAppleError(t('settings.delete.invalidAppleToken'));
      } else if (message.startsWith('active_jobs:')) {
        const parsed = Number(message.split(':')[1] ?? '0');
        if (Number.isFinite(parsed) && parsed > 0) {
          setActiveJobsCount(parsed);
        } else {
          console.warn('active_jobs 409 with zero count — keeping pre-flight count');
        }
        setForceConfirmed(false);
        setCredentialError(t('settings.delete.activeJobsWarning', { count: activeJobsCount }));
      } else if (message === 'cascade_incomplete' || message === 'auth_delete_failed') {
        setCredentialError(t('settings.delete.partialDeletion'));
      } else {
        setCredentialError(message || t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.warning}>{t('settings.delete.warning')}</Text>

          {needsForce ? (
            <View style={styles.activeJobsBox}>
              <Text style={styles.activeJobsText}>
                {t('settings.delete.activeJobsWarning', { count: activeJobsCount })}
              </Text>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setForceConfirmed(v => !v)}>
                <View style={[styles.checkbox, forceConfirmed && styles.checkboxChecked]}>
                  {forceConfirmed ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>{t('settings.delete.forceCheckbox')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.delete.typeToConfirm')}</Text>
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {hasEmailLogin ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t('settings.delete.passwordLabel')}</Text>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null]}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (passwordError) setPasswordError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>
          ) : isAppleOnly ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t('settings.delete.appleConfirmHint')}</Text>
              <TouchableOpacity
                style={[
                  styles.appleButton,
                  (isReauthingApple || appleIdToken !== null) && styles.appleButtonDisabled,
                ]}
                onPress={handleAppleReauth}
                disabled={isReauthingApple || appleIdToken !== null}
                activeOpacity={0.85}>
                {isReauthingApple ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.appleButtonText}>
                    {appleIdToken !== null
                      ? t('settings.delete.appleConfirmed')
                      : t('settings.delete.appleConfirm')}
                  </Text>
                )}
              </TouchableOpacity>
              {appleError ? <Text style={styles.errorText}>{appleError}</Text> : null}
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>{t('settings.delete.otpHelper')}</Text>
              {!keywordMatches && (
                <Text style={styles.otpKeywordHint}>
                  {t('settings.delete.otpKeywordHint', { keyword: expectedKeyword })}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  (isSendingOtp || !keywordMatches) && styles.secondaryButtonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={isSendingOtp || !keywordMatches}
                activeOpacity={0.7}>
                {isSendingOtp ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {otpSent ? t('settings.delete.resendOtp') : t('settings.delete.sendOtp')}
                  </Text>
                )}
              </TouchableOpacity>
              {otpSent ? (
                <Text style={styles.otpSentText}>
                  {t('settings.delete.otpSent', { email: user?.email ?? '' })}
                </Text>
              ) : null}
              <Text style={[styles.label, styles.otpInputLabel]}>
                {t('settings.delete.otpLabel')}
              </Text>
              <TextInput
                style={[styles.input, otpError ? styles.inputError : null]}
                value={otpCode}
                onChangeText={text => {
                  setOtpCode(text.replace(/\D/g, '').slice(0, 6));
                  if (otpError) setOtpError(null);
                }}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={6}
                textContentType="oneTimeCode"
              />
              {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.8}>
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.submitButtonText}>{t('settings.delete.submit')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  warning: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  activeJobsBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  activeJobsText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  otpSentText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  otpKeywordHint: {
    marginBottom: 6,
    fontSize: 13,
    color: COLORS.warning,
  },
  otpInputLabel: {
    marginTop: 16,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  appleButtonDisabled: {
    opacity: 0.6,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
