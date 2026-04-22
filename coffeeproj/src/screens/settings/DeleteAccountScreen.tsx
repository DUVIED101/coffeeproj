import React, { useEffect, useLayoutEffect, useState } from 'react';
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
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { BusinessService } from '../../services/BusinessService';
import { JobService } from '../../services/JobService';

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const deleteAccount = useAuthStore(s => s.deleteAccount);

  const expectedKeyword = t('settings.delete.confirmKeyword');

  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const canSubmit =
    keywordMatches && password.length > 0 && (!needsForce || forceConfirmed) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setPasswordError(null);
    try {
      await deleteAccount({ password, force: needsForce ? true : undefined });
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message === 'invalid_password') {
        setPasswordError(t('settings.delete.invalidPassword'));
      } else if (message.startsWith('active_jobs:')) {
        const parsed = Number(message.split(':')[1] ?? '0');
        if (Number.isFinite(parsed) && parsed > 0) {
          setActiveJobsCount(parsed);
        } else {
          console.warn('active_jobs 409 with zero count — keeping pre-flight count');
        }
        setForceConfirmed(false);
        setPasswordError(t('settings.delete.activeJobsWarning', { count: activeJobsCount }));
      } else {
        setPasswordError(message || t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
});
