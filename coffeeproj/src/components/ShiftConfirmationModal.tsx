import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { ApplicationService } from '../services/ApplicationService';
import type { ApplicationId } from '../types/ids';

type Props = {
  applicationId: ApplicationId;
  jobTitle: string;
  onConfirmed: () => void;
  onDeclined: () => void;
};

export const ShiftConfirmationModal = React.memo(
  ({ applicationId, jobTitle, onConfirmed, onDeclined }: Props) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);

    const handleResponse = async (response: 'confirmed' | 'declined') => {
      setBusy(true);
      try {
        await ApplicationService.respondToShiftConfirmation(applicationId, response);
        if (response === 'confirmed') {
          onConfirmed();
        } else {
          onDeclined();
        }
      } catch {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      } finally {
        setBusy(false);
      }
    };

    return (
      <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('shifts.confirmation.modalTitle')}</Text>
            <Text style={styles.jobTitle}>{jobTitle}</Text>
            <Text style={styles.body}>{t('shifts.confirmation.modalBody')}</Text>

            {busy ? (
              <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDecline]}
                  onPress={() => void handleResponse('declined')}
                  accessibilityLabel={t('shifts.confirmation.actionDecline')}>
                  <Text style={[styles.btnText, styles.btnTextDecline]}>
                    {t('shifts.confirmation.actionDecline')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnConfirm]}
                  onPress={() => void handleResponse('confirmed')}
                  accessibilityLabel={t('shifts.confirmation.actionConfirm')}>
                  <Text style={[styles.btnText, styles.btnTextConfirm]}>
                    {t('shifts.confirmation.actionConfirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  spinner: { marginVertical: 16 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnConfirm: { backgroundColor: COLORS.primary },
  btnDecline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.error ?? '#D32F2F',
  },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextConfirm: { color: '#fff' },
  btnTextDecline: { color: COLORS.error ?? '#D32F2F' },
});
