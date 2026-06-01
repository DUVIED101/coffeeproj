import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { clampToEffectiveLength, effectiveTextLength } from '../../utils/textLength';
import type { Job } from '../../types/job';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'Apply'>;
  route: RouteProp<BaristaStackParamList, 'Apply'>;
};

export const ApplyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { job } = route.params;
  const user = useAuthStore(state => state.user);
  const headerHeight = useHeaderHeight();

  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert(
        t('apply.errorTitle', { defaultValue: 'Ошибка' }),
        t('apply.errorNotAuthenticated', { defaultValue: 'Пользователь не авторизован' })
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await ApplicationService.createApplication({
        jobId: job.id,
        baristaId: user.id,
        coverLetter: coverLetter.trim() || undefined,
      });

      Alert.alert(
        t('apply.successTitle', { defaultValue: 'Готово' }),
        t('apply.success', { defaultValue: 'Отклик отправлен!' }),
        [
          {
            text: t('common.ok', { defaultValue: 'ОК' }),
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: unknown) {
      console.error('Error submitting application:', error);

      if (getErrorMessage(error) === 'You have already applied to this job') {
        Alert.alert(
          t('apply.duplicateTitle', { defaultValue: 'Отклик уже отправлен' }),
          t('apply.duplicate', { defaultValue: 'Вы уже откликнулись на эту вакансию' })
        );
      } else {
        Alert.alert(
          t('apply.errorTitle', { defaultValue: 'Ошибка' }),
          t('apply.errorFailed', {
            defaultValue: 'Не удалось отправить отклик. Попробуйте ещё раз.',
          })
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.jobSummary}>
            <Text style={styles.sectionTitle}>
              {t('apply.jobSummary', { defaultValue: 'О вакансии' })}
            </Text>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.businessName}>{job.businessName}</Text>
            {job.branchName && <Text style={styles.branchName}>{job.branchName}</Text>}
            <View style={styles.compensationContainer}>
              <Text style={styles.compensationAmount}>
                {job.compensation.amount.toLocaleString('ru-RU')} ₽
              </Text>
              <Text style={styles.compensationType}>
                {job.compensation.type === 'hourly'
                  ? t('apply.perHour', { defaultValue: 'за час' })
                  : job.compensation.type === 'daily'
                    ? t('apply.perDay', { defaultValue: 'за день' })
                    : t('apply.fixed', { defaultValue: 'фиксированная оплата' })}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('apply.coverLetter', { defaultValue: 'Сопроводительное письмо (опционально)' })}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('apply.coverLetterPlaceholder', {
                defaultValue: 'Расскажите работодателю, почему вы подходите для этой вакансии…',
              })}
              placeholderTextColor={COLORS.textSecondary}
              value={coverLetter}
              onChangeText={text => setCoverLetter(clampToEffectiveLength(text, 1000))}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {t('apply.charCounter', {
                count: effectiveTextLength(coverLetter),
                defaultValue: '{{count}}/1000',
              })}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {t('apply.submitCta', { defaultValue: 'Отправить отклик' })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  jobSummary: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  compensationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  compensationAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  compensationType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    maxHeight: 240,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
