import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationFeedService } from '../services/NotificationFeedService';
import type { Notification } from '../types/notification';
import type { NotificationId, UserId } from '../types/ids';

type NotificationFeedState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  channel: RealtimeChannel | null;
  load: (userId: UserId) => Promise<void>;
  refreshUnreadCount: (userId: UserId) => Promise<void>;
  markAsRead: (notificationId: NotificationId) => Promise<void>;
  markAllAsRead: (userId: UserId) => Promise<void>;
  clearAll: (userId: UserId) => Promise<void>;
  startRealtime: (userId: UserId) => void;
  stopRealtime: () => void;
  reset: () => void;
};

export const useNotificationFeedStore = create<NotificationFeedState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  channel: null,

  load: async (userId: UserId) => {
    set({ isLoading: true });
    try {
      const [notifications, unreadCount] = await Promise.all([
        NotificationFeedService.listForUser(userId),
        NotificationFeedService.unreadCount(userId),
      ]);
      set({ notifications, unreadCount });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUnreadCount: async (userId: UserId) => {
    const unreadCount = await NotificationFeedService.unreadCount(userId);
    set({ unreadCount });
  },

  markAsRead: async (notificationId: NotificationId) => {
    const previous = get().notifications;
    const target = previous.find(n => n.id === notificationId);
    if (!target || target.readAt) return;

    const now = new Date();
    set({
      notifications: previous.map(n => (n.id === notificationId ? { ...n, readAt: now } : n)),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });

    try {
      await NotificationFeedService.markAsRead(notificationId);
    } catch (error) {
      // Roll back optimistic update on failure.
      set({ notifications: previous, unreadCount: get().unreadCount + 1 });
      throw error;
    }
  },

  markAllAsRead: async (userId: UserId) => {
    const previous = get().notifications;
    const previousUnread = get().unreadCount;
    const now = new Date();
    set({
      notifications: previous.map(n => (n.readAt ? n : { ...n, readAt: now })),
      unreadCount: 0,
    });

    try {
      await NotificationFeedService.markAllAsRead(userId);
    } catch (error) {
      set({ notifications: previous, unreadCount: previousUnread });
      throw error;
    }
  },

  clearAll: async (userId: UserId) => {
    const previous = get().notifications;
    const previousUnread = get().unreadCount;
    set({ notifications: [], unreadCount: 0 });

    try {
      await NotificationFeedService.clearAll(userId);
    } catch (error) {
      set({ notifications: previous, unreadCount: previousUnread });
      throw error;
    }
  },

  startRealtime: (userId: UserId) => {
    if (get().channel) return;
    const channel = NotificationFeedService.subscribe(userId, incoming => {
      set(state => {
        if (state.notifications.some(n => n.id === incoming.id)) return state;
        return {
          notifications: [incoming, ...state.notifications],
          unreadCount: state.unreadCount + (incoming.readAt ? 0 : 1),
        };
      });
    });
    set({ channel });
  },

  stopRealtime: () => {
    const channel = get().channel;
    if (channel) {
      NotificationFeedService.unsubscribe(channel);
      set({ channel: null });
    }
  },

  reset: () => {
    const channel = get().channel;
    if (channel) {
      NotificationFeedService.unsubscribe(channel);
    }
    set({ notifications: [], unreadCount: 0, isLoading: false, channel: null });
  },
}));
