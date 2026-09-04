import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { EmploymentEndReason, EmploymentSide } from '@bystrobarista/core/types/employment';
import { endReasonLabelKey, endReasonsForSide } from '@bystrobarista/core/utils/employment';
import { clampToEffectiveLength, effectiveTextLength } from '../utils/textLength';

const MAX_COMMENT_LENGTH = 500;

type EndEmploymentModalProps = {
  visible: boolean;
  side: EmploymentSide;
  onSubmit: (reason: EmploymentEndReason, comment?: string) => Promise<void>;
  onClose: () => void;
};

export const EndEmploymentModal: React.FC<EndEmploymentModalProps> = ({
  visible,
  side,
  onSubmit,
  onClose,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<EmploymentEndReason | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasons = endReasonsForSide(side);

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setComment('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await onSubmit(reason, comment.trim() ? comment.trim() : undefined);
    } catch (error) {
      console.error('Error submitting employment end request:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [reason, comment, onSubmit]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.title} maxFontSizeMultiplier={1.6}>
              {t('employment.end.title')}
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.6}>
              {t(
                side === 'business' ? 'employment.end.bodyBusiness' : 'employment.end.bodyBarista'
              )}
            </Text>

            <Text style={styles.reasonLabel} maxFontSizeMultiplier={1.6}>
              {t('employment.end.reasonLabel')}
            </Text>
            {reasons.map(item => {
              const selected = item === reason;
              return (
                <TouchableOpacity
                  key={item}
                  style={styles.reasonRow}
                  onPress={() => setReason(item)}
                  disabled={isSubmitting}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}>
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={selected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.reasonText} maxFontSizeMultiplier={1.6}>
                    {t(endReasonLabelKey(item))}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TextInput
              value={comment}
              onChangeText={text => setComment(clampToEffectiveLength(text, MAX_COMMENT_LENGTH))}
              placeholder={t('employment.end.commentPlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
              maxFontSizeMultiplier={1.6}
            />
            <Text style={styles.counter}>
              {`${effectiveTextLength(comment)}/${MAX_COMMENT_LENGTH}`}
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, !reason && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!reason || isSubmitting}
              accessibilityRole="button">
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText} maxFontSizeMultiplier={1.6}>
                  {t('employment.end.confirm')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
              accessibilityRole="button">
              <Text style={styles.cancelText} maxFontSizeMultiplier={1.6}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  reasonText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    maxHeight: 160,
    backgroundColor: COLORS.background,
    marginTop: 10,
  },
  counter: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
