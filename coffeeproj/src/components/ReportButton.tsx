import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { ReportService } from '../services/ReportService';
import type { ReportReasonCode, ReportTargetType } from '../types';
import { showErrorToast, showSuccessToast } from '../stores/errorToastStore';

const REASONS: ReportReasonCode[] = [
  'spam',
  'fraud',
  'harassment',
  'noshow',
  'offensive_photo',
  'other',
];

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  variant?: 'inline' | 'icon';
};

export const ReportButton: React.FC<Props> = memo(
  ({ targetType, targetId, variant = 'inline' }) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [reason, setReason] = useState<ReportReasonCode | null>(null);
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reset = useCallback(() => {
      setReason(null);
      setDetails('');
      setIsSubmitting(false);
    }, []);

    const handleClose = useCallback(() => {
      setVisible(false);
      reset();
    }, [reset]);

    const handleSubmit = useCallback(async () => {
      if (!reason) return;
      setIsSubmitting(true);
      try {
        await ReportService.submitReport({
          targetType,
          targetId,
          reasonCode: reason,
          details: details.trim() || undefined,
        });
        showSuccessToast(t('report.success'));
        handleClose();
      } catch (error) {
        console.error('ReportButton: submit failed', error);
        showErrorToast(t('report.error'));
        setIsSubmitting(false);
      }
    }, [reason, details, targetType, targetId, t, handleClose]);

    return (
      <>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={variant === 'icon' ? styles.iconButton : styles.inlineButton}
          accessibilityRole="button"
          accessibilityLabel={t('report.buttonLabel')}>
          <Text style={variant === 'icon' ? styles.iconButtonText : styles.inlineButtonText}>
            {t('report.buttonLabel')}
          </Text>
        </TouchableOpacity>

        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalRoot}>
            <View style={styles.sheet}>
              <Text style={styles.title}>{t('report.title')}</Text>
              <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

              <Text style={styles.sectionLabel}>{t('report.chooseReason')}</Text>
              <View style={styles.reasonGrid}>
                {REASONS.map(code => {
                  const selected = reason === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => setReason(code)}
                      style={[styles.reasonChip, selected && styles.reasonChipSelected]}>
                      <Text
                        style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>
                        {t(`report.reason.${code}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder={t('report.detailsPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                multiline
                maxLength={500}
                style={styles.input}
              />

              <View style={styles.row}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.cancelButton}
                  disabled={isSubmitting}>
                  <Text style={styles.cancelText}>{t('report.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!reason || isSubmitting}
                  style={[
                    styles.submitButton,
                    (!reason || isSubmitting) && styles.submitButtonDisabled,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>{t('report.submit')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }
);

ReportButton.displayName = 'ReportButton';

const styles = StyleSheet.create({
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inlineButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonChipText: {
    color: COLORS.text,
    fontSize: 13,
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: COLORS.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
