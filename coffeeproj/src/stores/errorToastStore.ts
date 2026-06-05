import { create } from 'zustand';

export type ErrorToastKind = 'error' | 'success' | 'info';

export type ErrorToast = {
  id: number;
  kind: ErrorToastKind;
  message: string;
  onRetry?: () => void;
};

type State = {
  current: ErrorToast | null;
  show: (toast: Omit<ErrorToast, 'id'>) => void;
  dismiss: () => void;
};

let nextId = 1;

export const useErrorToastStore = create<State>(set => ({
  current: null,
  show: (toast: Omit<ErrorToast, 'id'>) => {
    nextId += 1;
    set({ current: { ...toast, id: nextId } });
  },
  dismiss: () => set({ current: null }),
}));

/** Convenience helper for the most common path: surface an error message. */
export const showErrorToast = (message: string, onRetry?: () => void): void => {
  useErrorToastStore.getState().show({ kind: 'error', message, onRetry });
};

export const showSuccessToast = (message: string): void => {
  useErrorToastStore.getState().show({ kind: 'success', message });
};

export const showInfoToast = (message: string): void => {
  useErrorToastStore.getState().show({ kind: 'info', message });
};
