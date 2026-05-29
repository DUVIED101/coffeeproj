import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { AuthService } from '../../services/AuthService';
import { PasswordInput } from '../../components/PasswordInput';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Navigation = NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.password.title') });
  }, [navigation, t]);

  const newPasswordError = useMemo<string | null>(() => {
    if (!newPassword) return null;
    if (newPassword.length < MIN_PASSWORD_LENGTH) return t('settings.password.minLength');
    if (newPassword.length > MAX_PASSWORD_LENGTH) return t('settings.password.minLength');
    if (newPassword === currentPassword) return t('settings.password.sameAsCurrent');
    return null;
  }, [newPassword, currentPassword, t]);

  const confirmError = useMemo<string | null>(() => {
    if (!confirmPassword) return null;
    if (confirmPassword !== newPassword) return t('settings.password.mismatch');
    return null;
  }, [confirmPassword, newPassword, t]);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length <= MAX_PASSWORD_LENGTH &&
    newPassword !== currentPassword &&
    confirmPassword === newPassword &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setCurrentError(null);
    setNewError(null);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      Alert.alert(t('common.success'), t('settings.password.success'), [
        { text: t('common.close'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message === 'invalid_current_password') {
        setCurrentError(t('settings.password.invalidCurrent'));
      } else if (message === 'password_reused') {
        setNewError(t('settings.password.passwordReused'));
      } else {
        Alert.alert(t('common.error'), message || t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.current')}</Text>
            <PasswordInput
              value={currentPassword}
              onChangeText={text => {
                setCurrentPassword(text);
                if (currentError) setCurrentError(null);
              }}
              hasError={!!currentError}
              textContentType="password"
            />
            {currentError ? <Text style={styles.errorText}>{currentError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.new')}</Text>
            <PasswordInput
              value={newPassword}
              onChangeText={text => {
                setNewPassword(text);
                if (newError) setNewError(null);
              }}
              hasError={!!newPasswordError || !!newError}
              textContentType="newPassword"
            />
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
            {!newPasswordError && newError ? (
              <Text style={styles.errorText}>{newError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.confirm')}</Text>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              hasError={!!confirmError}
              textContentType="newPassword"
            />
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.8}>
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.submitButtonText}>{t('settings.password.submit')}</Text>
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
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
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
});
