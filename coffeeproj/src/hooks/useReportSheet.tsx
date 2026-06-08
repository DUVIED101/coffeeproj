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
import { showSuccessToast } from '../stores/errorToastStore';
import { handleApiError } from '../utils/handleApiError';
import { useAuthStore } from '../stores/authStore';

const REASONS_BY_TARGET: Record<ReportTargetType, ReportReasonCode[]> = {
  user: ['spam', 'fraud', 'harassment', 'noshow', 'offensive_photo', 'other'],
  business: ['fraud', 'harassment', 'offensive_photo', 'other'],
  branch: ['fraud', 'harassment', 'offensive_photo', 'other'],
  job: ['spam', 'fraud', 'offensive_photo', 'other'],
  message: ['spam', 'harassment', 'offensive_photo', 'other'],
  review: ['spam', 'harassment', 'fraud', 'other'],
};

export type ReportTarget = { type: ReportTargetType; id: string };

type SheetProps = {
  target: ReportTarget | null;
  onClose: () => void;
};

/**
 * Internal — the bottom-sheet modal that picks a reason and submits a report.
 * Driven externally by `target` (null = hidden). Not exported; consumers use
 * `useReportSheet()` or `<ReportButton>`.
 */
const ReportSheet = memo<SheetProps>(({ target, onClose }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReasonCode | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setReason(null);
    setDetails('');
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  const handleSubmit = useCallback(async () => {
    if (!target || !reason) return;
    setIsSubmitting(true);
    try {
      await ReportService.submitReport({
        targetType: target.type,
        targetId: target.id,
        reasonCode: reason,
        details: details.trim() || undefined,
      });
      showSuccessToast(t('report.success'));
      handleClose();
    } catch (error) {
      console.error('ReportSheet: submit failed', error);
      await handleApiError(error);
      setIsSubmitting(false);
    }
  }, [target, reason, details, t, handleClose]);

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('report.title')}</Text>
          <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

          <Text style={styles.sectionLabel}>{t('report.chooseReason')}</Text>
          <View style={styles.reasonGrid}>
            {(target ? REASONS_BY_TARGET[target.type] : []).map(code => {
              const selected = reason === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => setReason(code)}
                  style={[styles.reasonChip, selected && styles.reasonChipSelected]}>
                  <Text style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>
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
  );
});

ReportSheet.displayName = 'ReportSheet';

/**
 * Imperative report modal. Call `open({type, id})` from any handler; render
 * `{sheet}` once anywhere in the same tree.
 *
 * Example:
 *   const { open, sheet } = useReportSheet();
 *   <TouchableOpacity onLongPress={() => open({ type: 'message', id: msg.id })} />
 *   {sheet}
 */
export function useReportSheet() {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const open = useCallback((next: ReportTarget) => {
    const user = useAuthStore.getState().user;
    if (user?.bannedAt) return;
    if (user?.suspendedUntil && new Date(user.suspendedUntil).getTime() > Date.now()) return;
    setTarget(next);
  }, []);
  const close = useCallback(() => setTarget(null), []);
  const sheet = <ReportSheet target={target} onClose={close} />;
  return { open, sheet };
}

const styles = StyleSheet.create({
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
  submitText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
