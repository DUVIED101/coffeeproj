import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { Employment, EmploymentSide } from '@bystrobarista/core/types/employment';
import type { ApplicationId, JobId } from '@bystrobarista/core/types/ids';
import {
  canCancelEmploymentEndRequest,
  canConfirmEmploymentEnd,
  canConfirmEmploymentStart,
  canRequestEmploymentEnd,
  endReasonLabelKey,
} from '@bystrobarista/core/utils/employment';
import { employmentEndedByKeys, formatEmploymentDate } from '../utils/employmentPresentation';

type ActionVariant = 'primary' | 'danger' | 'outline';

type ActionButtonProps = {
  label: string;
  variant: ActionVariant;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
};

const ActionButton: React.FC<ActionButtonProps> = ({ label, variant, onPress, disabled, busy }) => (
  <TouchableOpacity
    style={[styles.button, styles[variant], disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button">
    {busy ? (
      <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : COLORS.primary} />
    ) : (
      <Text style={[styles.buttonText, styles[`${variant}Text`]]}>{label}</Text>
    )}
  </TouchableOpacity>
);

type EmploymentStageActionsProps = {
  employment: Employment;
  side: EmploymentSide;
  isProcessing: boolean;
  canReopenJob?: boolean;
  onConfirmStart: (applicationId: ApplicationId) => void;
  onRequestEnd: (applicationId: ApplicationId) => void;
  onConfirmEnd: (applicationId: ApplicationId) => void;
  onCancelEndRequest: (applicationId: ApplicationId) => void;
  onReopenJob?: (jobId: JobId) => void;
};

export const EmploymentStageActions = React.memo<EmploymentStageActionsProps>(
  ({
    employment,
    side,
    isProcessing,
    canReopenJob = false,
    onConfirmStart,
    onRequestEnd,
    onConfirmEnd,
    onCancelEndRequest,
    onReopenJob,
  }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const { applicationId, jobId } = employment;

    const handleConfirmStart = useCallback(
      () => onConfirmStart(applicationId),
      [onConfirmStart, applicationId]
    );
    const handleRequestEnd = useCallback(
      () => onRequestEnd(applicationId),
      [onRequestEnd, applicationId]
    );
    const handleConfirmEnd = useCallback(
      () => onConfirmEnd(applicationId),
      [onConfirmEnd, applicationId]
    );
    const handleCancelEndRequest = useCallback(
      () => onCancelEndRequest(applicationId),
      [onCancelEndRequest, applicationId]
    );
    const handleReopenJob = useCallback(() => onReopenJob?.(jobId), [onReopenJob, jobId]);

    const showConfirmStart = canConfirmEmploymentStart(employment);
    const showRequestEnd = canRequestEmploymentEnd(employment);
    const counterpartRequestedEnd = canConfirmEmploymentEnd(employment, side);
    const ownRequestPending = canCancelEmploymentEndRequest(employment, side);
    const isEnded = employment.status === 'ended';
    const showEndDetails = employment.status === 'ending' || isEnded;
    const showReopen = isEnded && canReopenJob && onReopenJob !== undefined;

    const requestEndLabelKey =
      side === 'business'
        ? showConfirmStart
          ? 'employment.start.noShow'
          : 'employment.end.actionBusiness'
        : 'employment.end.actionBarista';
    const pendingLabelKey = counterpartRequestedEnd
      ? side === 'business'
        ? 'employment.end.pendingByBarista'
        : 'employment.end.pendingByBusiness'
      : 'employment.end.pendingOwn';

    return (
      <View style={styles.container}>
        {(counterpartRequestedEnd || ownRequestPending) && (
          <Text style={styles.statusText}>{t(pendingLabelKey)}</Text>
        )}
        {showEndDetails && employment.endReason ? (
          <Text style={styles.detailText}>
            {t('employment.end.reasonLine', { reason: t(endReasonLabelKey(employment.endReason)) })}
          </Text>
        ) : null}
        {showEndDetails && employment.endComment ? (
          <Text style={styles.commentText}>«{employment.endComment}»</Text>
        ) : null}
        {employment.status === 'ending' && employment.endAutoConfirmAt ? (
          <Text style={styles.detailText}>
            {t('employment.end.autoHint', {
              date: formatEmploymentDate(employment.endAutoConfirmAt, locale),
            })}
          </Text>
        ) : null}
        {isEnded &&
          employmentEndedByKeys(employment).map(key => (
            <Text key={key} style={styles.detailText}>
              {t(key)}
            </Text>
          ))}

        {showConfirmStart && (
          <ActionButton
            label={t(
              side === 'business' ? 'employment.start.action' : 'employment.start.actionBarista'
            )}
            variant="primary"
            onPress={handleConfirmStart}
            disabled={isProcessing}
            busy={isProcessing}
          />
        )}
        {showRequestEnd && (
          <ActionButton
            label={t(requestEndLabelKey)}
            variant="danger"
            onPress={handleRequestEnd}
            disabled={isProcessing}
            busy={isProcessing && !showConfirmStart}
          />
        )}
        {counterpartRequestedEnd && (
          <ActionButton
            label={t('employment.end.confirmAction')}
            variant="primary"
            onPress={handleConfirmEnd}
            disabled={isProcessing}
            busy={isProcessing}
          />
        )}
        {ownRequestPending && (
          <ActionButton
            label={t('employment.end.cancelRequest')}
            variant="outline"
            onPress={handleCancelEndRequest}
            disabled={isProcessing}
            busy={isProcessing}
          />
        )}
        {showReopen && (
          <ActionButton
            label={t('employment.reopenJob')}
            variant="outline"
            onPress={handleReopenJob}
            disabled={isProcessing}
            busy={false}
          />
        )}
      </View>
    );
  }
);

EmploymentStageActions.displayName = 'EmploymentStageActions';

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  commentText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primary: {
    backgroundColor: '#10B981',
  },
  primaryText: {
    color: '#fff',
  },
  danger: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerText: {
    color: '#EF4444',
  },
  outline: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },
});
