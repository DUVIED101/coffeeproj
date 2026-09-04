import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmploymentService } from '@bystrobarista/core/services/EmploymentService';
import { JobService } from '@bystrobarista/core/services/JobService';
import type {
  Employment,
  EmploymentEndReason,
  EmploymentSide,
} from '@bystrobarista/core/types/employment';
import type { ApplicationId, JobId, UserId } from '@bystrobarista/core/types/ids';
import { EndEmploymentModal } from '../components/EndEmploymentModal';
import { showErrorToast, showSuccessToast } from '../stores/errorToastStore';

type SuccessKey =
  | 'employment.start.success'
  | 'employment.end.requestSuccess'
  | 'employment.end.confirmSuccess'
  | 'employment.end.cancelSuccess';

type FailureKey = 'employment.start.failure' | 'employment.end.failure';

type UseEmploymentActionsOptions = {
  side: EmploymentSide;
  userId?: UserId;
  onChanged: () => Promise<void> | void;
  onEnded?: (employment: Employment) => Promise<void> | void;
};

export type EmploymentActions = {
  processingIds: Set<string>;
  confirmStart: (applicationId: ApplicationId) => void;
  requestEnd: (applicationId: ApplicationId) => void;
  confirmEnd: (applicationId: ApplicationId) => void;
  cancelEndRequest: (applicationId: ApplicationId) => void;
  reopenJob: (jobId: JobId) => void;
  endModal: React.ReactElement;
};

export const useEmploymentActions = ({
  side,
  userId,
  onChanged,
  onEnded,
}: UseEmploymentActionsOptions): EmploymentActions => {
  const { t } = useTranslation();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [endTarget, setEndTarget] = useState<ApplicationId | null>(null);

  const markProcessing = useCallback((id: string, on: boolean) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const runLifecycle = useCallback(
    async (
      applicationId: ApplicationId,
      action: () => Promise<Employment>,
      successKey: SuccessKey,
      failureKey: FailureKey
    ): Promise<Employment | null> => {
      markProcessing(applicationId, true);
      try {
        const updated = await action();
        await onChanged();
        showSuccessToast(t(successKey));
        return updated;
      } catch (error) {
        console.error('Error updating employment:', error);
        showErrorToast(t(failureKey));
        return null;
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [markProcessing, onChanged, t]
  );

  const confirmStart = useCallback(
    (applicationId: ApplicationId) => {
      Alert.alert(t('employment.start.confirmTitle'), t('employment.start.confirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () =>
            void runLifecycle(
              applicationId,
              () => EmploymentService.confirmStart(applicationId),
              'employment.start.success',
              'employment.start.failure'
            ),
        },
      ]);
    },
    [runLifecycle, t]
  );

  const requestEnd = useCallback((applicationId: ApplicationId) => {
    setEndTarget(applicationId);
  }, []);

  const submitEndRequest = useCallback(
    async (reason: EmploymentEndReason, comment?: string) => {
      if (!endTarget) return;
      const updated = await runLifecycle(
        endTarget,
        () => EmploymentService.requestEnd({ applicationId: endTarget, reason, comment }),
        'employment.end.requestSuccess',
        'employment.end.failure'
      );
      if (updated) setEndTarget(null);
    },
    [endTarget, runLifecycle]
  );

  const closeEndModal = useCallback(() => setEndTarget(null), []);

  const confirmEnd = useCallback(
    (applicationId: ApplicationId) => {
      Alert.alert(t('employment.end.confirmTitle'), t('employment.end.confirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('employment.end.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            const updated = await runLifecycle(
              applicationId,
              () => EmploymentService.confirmEnd(applicationId),
              'employment.end.confirmSuccess',
              'employment.end.failure'
            );
            if (updated) await onEnded?.(updated);
          },
        },
      ]);
    },
    [runLifecycle, onEnded, t]
  );

  const cancelEndRequest = useCallback(
    (applicationId: ApplicationId) => {
      void runLifecycle(
        applicationId,
        () => EmploymentService.cancelEndRequest(applicationId),
        'employment.end.cancelSuccess',
        'employment.end.failure'
      );
    },
    [runLifecycle]
  );

  const reopenJob = useCallback(
    (jobId: JobId) => {
      if (!userId) return;
      Alert.alert(t('job.reopen.confirmTitle'), t('job.reopen.confirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await JobService.updateJobStatus(jobId, 'open', userId);
              await onChanged();
              showSuccessToast(t('employment.reopenSuccess'));
            } catch (error) {
              console.error('Error reopening job:', error);
              showErrorToast(t('job.errors.updateFailed'));
            }
          },
        },
      ]);
    },
    [userId, onChanged, t]
  );

  const endModal = (
    <EndEmploymentModal
      visible={endTarget !== null}
      side={side}
      onSubmit={submitEndRequest}
      onClose={closeEndModal}
    />
  );

  return {
    processingIds,
    confirmStart,
    requestEnd,
    confirmEnd,
    cancelEndRequest,
    reopenJob,
    endModal,
  };
};
