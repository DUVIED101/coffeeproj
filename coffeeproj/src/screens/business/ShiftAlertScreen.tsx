import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { ApplicationService } from '../../services/ApplicationService';
import { COLORS } from '../../config/constants';
import type { ApplicationId } from '../../types/ids';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';
import { showErrorToast } from '../../stores/errorToastStore';

type Props = NativeStackScreenProps<BusinessStackParamList, 'ShiftAlert'>;

const formatRemaining = (ms: number): string => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
};

export const ShiftAlertScreen: React.FC<Props> = ({ route, navigation }) => {
  const { applicationId, jobTitle, shiftStartIso } = route.params;
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = new Date(shiftStartIso).getTime() - Date.now();
      setRemaining(formatRemaining(ms));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [shiftStartIso]);

  const handleCancel = useCallback(async () => {
    if (!user) return;
    Alert.alert(
      t('applications.cancelShift.confirmTitle'),
      t('applications.cancelShift.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shifts.noResponseAlert.cancelAction'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await ApplicationService.cancelAcceptedShiftAsBusiness(
                applicationId as ApplicationId,
                user.id,
                reason.trim() || undefined
              );
              navigation.goBack();
            } catch {
              showErrorToast(t('common.tryAgain'));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }, [applicationId, navigation, reason, t, user]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('shifts.noResponseAlert.screenTitle')}</Text>
      <Text style={styles.jobTitle}>{jobTitle}</Text>
      <Text style={styles.body}>{t('shifts.noResponseAlert.screenBody', { remaining })}</Text>

      <Text style={styles.label}>{t('shifts.noResponseAlert.reasonLabel')}</Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder={t('shifts.noResponseAlert.reasonLabel')}
        placeholderTextColor={COLORS.textSecondary}
        multiline
        numberOfLines={3}
        maxLength={300}
        accessibilityLabel={t('shifts.noResponseAlert.reasonLabel')}
      />

      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={() => void handleCancel()}
              accessibilityLabel={t('shifts.noResponseAlert.cancelAction')}>
              <Text style={[styles.btnText, styles.btnTextCancel]}>
                {t('shifts.noResponseAlert.cancelAction')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnWait]}
              onPress={() => navigation.goBack()}
              accessibilityLabel={t('shifts.noResponseAlert.waitAction')}>
              <Text style={[styles.btnText, styles.btnTextWait]}>
                {t('shifts.noResponseAlert.waitAction')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border ?? '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 32,
  },
  actions: { gap: 12 },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancel: { backgroundColor: COLORS.error },
  btnWait: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextCancel: { color: '#fff' },
  btnTextWait: { color: COLORS.primary },
});
