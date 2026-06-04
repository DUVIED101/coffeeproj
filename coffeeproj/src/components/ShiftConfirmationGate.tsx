import React, { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { usePendingShiftConfirmationStore } from '../stores/pendingShiftConfirmationStore';
import { ApplicationService } from '../services/ApplicationService';
import { ShiftConfirmationModal } from './ShiftConfirmationModal';

// Polls every 60s so an outgoing confirmation request flips the gate within
// a minute even without a push delivery.
const POLL_INTERVAL_MS = 60_000;

export const ShiftConfirmationGate: React.FC = () => {
  const userId = useAuthStore(s => s.user?.id);
  const isBarista = useAuthStore(s => s.user?.accountType === 'barista');
  const pending = usePendingShiftConfirmationStore(s => s.pending);
  const setPending = usePendingShiftConfirmationStore(s => s.set);
  const clearPending = usePendingShiftConfirmationStore(s => s.clear);

  const refresh = useCallback(async () => {
    if (!userId || !isBarista) {
      clearPending();
      return;
    }
    try {
      const next = await ApplicationService.getPendingShiftConfirmation(userId);
      setPending(next);
    } catch (err) {
      console.warn('ShiftConfirmationGate.refresh failed', err);
    }
  }, [userId, isBarista, setPending, clearPending]);

  useEffect(() => {
    void refresh();
    const intervalId = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [refresh]);

  if (!pending) return null;

  return (
    <ShiftConfirmationModal
      applicationId={pending.applicationId}
      jobTitle={pending.jobTitle}
      onConfirmed={() => {
        clearPending();
        void refresh();
      }}
      onDeclined={() => {
        clearPending();
        void refresh();
      }}
    />
  );
};
