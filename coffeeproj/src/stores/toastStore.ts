import { create } from 'zustand';
import type { Notification } from '../types/notification';

type ToastState = {
  current: Notification | null;
  show: (notification: Notification) => void;
  dismiss: () => void;
};

export const useToastStore = create<ToastState>(set => ({
  current: null,
  show: (notification: Notification) => set({ current: notification }),
  dismiss: () => set({ current: null }),
}));
