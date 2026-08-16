import { create } from 'zustand';
import type { ApplicationId } from '../types/ids';

export type PendingShiftConfirmation = {
  applicationId: ApplicationId;
  jobTitle: string;
};

type PendingShiftConfirmationState = {
  pending: PendingShiftConfirmation | null;
  set: (next: PendingShiftConfirmation | null) => void;
  clear: () => void;
};

export const usePendingShiftConfirmationStore = create<PendingShiftConfirmationState>(set => ({
  pending: null,
  set: next => set({ pending: next }),
  clear: () => set({ pending: null }),
}));
