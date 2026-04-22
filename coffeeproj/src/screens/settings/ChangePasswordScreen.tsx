import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Navigation = NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;

const MIN_PASSWORD_LENGTH = 8;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.password.title') });
  }, [navigation, t]);

  const newPasswordError = useMemo<string | null>(() => {
    if (!newPassword) return null;
    if (newPassword.length < MIN_PASSWORD_LENGTH) return t('settings.password.minLength');
    if (currentPassword && newPassword === currentPassword)
      return t('settings.password.sameAsCurrent');
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
    newPassword !== currentPassword &&
    confirmPassword === newPassword &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setCurrentError(null);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      Alert.alert(t('common.success'), t('settings.password.success'), [
        { text: t('common.close'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message === 'invalid_current_password') {
        setCurrentError(t('settings.password.invalidCurrent'));
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.current')}</Text>
            <TextInput
              style={[styles.input, currentError ? styles.inputError : null]}
              value={currentPassword}
              onChangeText={text => {
                setCurrentPassword(text);
                if (currentError) setCurrentError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            {currentError ? <Text style={styles.errorText}>{currentError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.new')}</Text>
            <TextInput
              style={[styles.input, newPasswordError ? styles.inputError : null]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.password.confirm')}</Text>
            <TextInput
              style={[styles.input, confirmError ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
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
    backgroundColor: COLORS.primary,
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
