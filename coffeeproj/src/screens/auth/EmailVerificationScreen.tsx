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
import { AuthService } from '../../services/AuthService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
  route: RouteProp<AuthStackParamList, 'EmailVerification'>;
};

const CODE_LENGTH = 6;

export const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Неверный код', `Введите ${CODE_LENGTH}-значный код из письма.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await AuthService.verifySignupOtp(email, code.trim());
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const friendly = message.toLowerCase().includes('expired')
        ? 'Срок действия кода истёк. Запросите новый.'
        : message.toLowerCase().includes('invalid')
          ? 'Неверный код. Проверьте письмо и попробуйте снова.'
          : message;
      Alert.alert('Не удалось подтвердить', friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setIsResending(true);
    try {
      await AuthService.resendSignupOtp(email);
      Alert.alert('Код отправлен', 'Проверьте почту — мы выслали новый код.');
    } catch (error: unknown) {
      Alert.alert('Ошибка', getErrorMessage(error));
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
            accessibilityLabel="Назад"
            style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Подтвердите email</Text>
            <Text style={styles.subtitle}>
              Мы отправили {CODE_LENGTH}-значный код на {email}. Введите его, чтобы завершить
              регистрацию.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Код из письма</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                placeholder="123456"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                textContentType="oneTimeCode"
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
                <Text style={styles.buttonText}>Подтвердить</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending}
              style={styles.resendWrap}>
              <Text style={styles.resendText}>
                {isResending ? 'Отправляем…' : 'Отправить код ещё раз'}
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
