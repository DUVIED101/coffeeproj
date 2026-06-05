import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import type { ApplicationId } from '../../types/ids';
import { showErrorToast } from '../../stores/errorToastStore';

type DisputeCategory =
  | 'no_show'
  | 'intoxication'
  | 'harassment'
  | 'safety'
  | 'fraud'
  | 'unpaid'
  | 'misrepresentation'
  | 'other';

type DisputeSeverity = 'warning' | 'serious' | 'critical';

const BARISTA_CATEGORIES: DisputeCategory[] = [
  'unpaid',
  'misrepresentation',
  'harassment',
  'safety',
  'fraud',
  'other',
];

const BUSINESS_CATEGORIES: DisputeCategory[] = [
  'no_show',
  'intoxication',
  'harassment',
  'safety',
  'fraud',
  'other',
];

const SEVERITIES: DisputeSeverity[] = ['warning', 'serious', 'critical'];

type DisputeFormParamList = {
  DisputeForm: { applicationId: string; role: 'barista' | 'business' };
};

type Props = NativeStackScreenProps<DisputeFormParamList, 'DisputeForm'>;

export const DisputeFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const applicationId = route.params.applicationId as ApplicationId;
  const role = route.params.role;
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const [categories, setCategories] = useState<DisputeCategory[]>([]);
  const [severity, setSeverity] = useState<DisputeSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const availableCategories = role === 'barista' ? BARISTA_CATEGORIES : BUSINESS_CATEGORIES;
  const canSubmit = categories.length > 0 && severity !== null && description.trim().length >= 30;

  const toggleCategory = (c: DisputeCategory) => {
    setCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await ApplicationService.submitApplicationDispute({
        applicationId,
        categories,
        severity: severity!,
        description: description.trim(),
      });
      Alert.alert(t('disputes.successTitle'), t('disputes.successBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const code: string = err?.message ?? '';
      if (code.includes('ALREADY_FILED') || code.includes('unique')) {
        showErrorToast(t('disputes.errors.alreadyFiled'));
      } else if (code.includes('APPLICATION_NOT_ACTIVE')) {
        showErrorToast(t('disputes.errors.notEligible'));
      } else {
        showErrorToast(t('common.tryAgain'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('disputes.formTitle')}</Text>
        <Text style={styles.intro}>{t('disputes.formIntro')}</Text>

        <Text style={styles.label}>{t('disputes.categoryLabel')}</Text>
        <View style={styles.chipRow}>
          {availableCategories.map(c => {
            const selected = categories.includes(c);
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleCategory(c)}
                accessibilityLabel={t(`disputes.category.${c}`)}
                accessibilityState={{ selected }}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {t(`disputes.category.${c}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('disputes.severityLabel')}</Text>
        <View style={styles.chipRow}>
          {SEVERITIES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, severity === s && styles.chipSelected, severityStyle(s)]}
              onPress={() => setSeverity(s)}
              accessibilityLabel={t(`disputes.severity.${s}`)}>
              <Text style={[styles.chipText, severity === s && styles.chipTextSelected]}>
                {t(`disputes.severity.${s}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('disputes.descriptionLabel')}</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder={t('disputes.descriptionPlaceholder')}
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
          accessibilityLabel={t('disputes.descriptionLabel')}
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>

        {busy ? (
          <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
            onPress={() => void handleSubmit()}
            accessibilityLabel={t('disputes.submit')}>
            <Text style={styles.submitBtnText}>{t('disputes.submit')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const severityStyle = (s: DisputeSeverity) => {
  if (s === 'critical') return { borderColor: COLORS.error };
  if (s === 'serious') return { borderColor: '#FF8C00' };
  return {};
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: 24, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  intro: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border ?? '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border ?? '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: { fontSize: 12, color: COLORS.textSecondary, alignSelf: 'flex-end', marginBottom: 24 },
  spinner: { marginVertical: 16 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
