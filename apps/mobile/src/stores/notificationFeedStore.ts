import { create } from 'zustand';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationFeedService } from '../services/NotificationFeedService';
import { useToastStore } from './toastStore';
import { navigationRef } from '../navigation/navigationRef';
import type { Notification } from '../types/notification';
import type { ConversationId } from '../types/chat';
import type { JobOfferId, NotificationId, UserId } from '../types/ids';

/**
 * Skip the in-app toast when the user is already viewing the destination screen
 * for that notification (e.g. don't toast a new_message while the user is in
 * the conversation it belongs to).
 */
const shouldSuppressToast = (notification: Notification): boolean => {
  if (!navigationRef.isReady()) return false;
  const route = navigationRef.getCurrentRoute();
  if (!route) return false;

  if (notification.kind === 'new_message' || notification.kind === 'conversation_started') {
    const params = route.params as { conversationId?: string } | undefined;
    return route.name === 'Chat' && params?.conversationId === notification.data.conversationId;
  }
  return false;
};

type NotificationFeedState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  channel: RealtimeChannel | null;
  load: (userId: UserId) => Promise<void>;
  refreshUnreadCount: (userId: UserId) => Promise<void>;
  markAsRead: (notificationId: NotificationId) => Promise<void>;
  markAllAsRead: (userId: UserId) => Promise<void>;
  markConversationAsRead: (userId: UserId, conversationId: ConversationId) => Promise<void>;
  clearAll: (userId: UserId) => Promise<void>;
  deleteByOfferId: (offerId: JobOfferId) => Promise<void>;
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

  markConversationAsRead: async (userId: UserId, conversationId: ConversationId) => {
    const previous = get().notifications;
    const previousUnread = get().unreadCount;
    const isChatRelated = (n: Notification): boolean =>
      (n.kind === 'new_message' || n.kind === 'conversation_started') &&
      n.data.conversationId === conversationId;
    const matching = previous.filter(n => isChatRelated(n) && !n.readAt);
    if (matching.length === 0) return;

    const now = new Date();
    set({
      notifications: previous.map(n => (isChatRelated(n) && !n.readAt ? { ...n, readAt: now } : n)),
      unreadCount: Math.max(0, previousUnread - matching.length),
    });

    try {
      await NotificationFeedService.markConversationAsRead(userId, conversationId);
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

  deleteByOfferId: async (offerId: JobOfferId) => {
    const previous = get().notifications;
    const previousUnread = get().unreadCount;
    const matching = previous.filter(n => (n.data as { offerId?: string }).offerId === offerId);
    if (matching.length === 0) {
      await NotificationFeedService.deleteByOfferId(offerId);
      return;
    }
    const unreadRemoved = matching.filter(n => !n.readAt).length;
    set({
      notifications: previous.filter(n => (n.data as { offerId?: string }).offerId !== offerId),
      unreadCount: Math.max(0, previousUnread - unreadRemoved),
    });
    try {
      await NotificationFeedService.deleteByOfferId(offerId);
    } catch (error) {
      set({ notifications: previous, unreadCount: previousUnread });
      throw error;
    }
  },

  startRealtime: (userId: UserId) => {
    if (get().channel) return;
    const channel = NotificationFeedService.subscribe(userId, incoming => {
      let isDuplicate = false;
      set(state => {
        if (state.notifications.some(n => n.id === incoming.id)) {
          isDuplicate = true;
          return state;
        }
        return {
          notifications: [incoming, ...state.notifications],
          unreadCount: state.unreadCount + (incoming.readAt ? 0 : 1),
        };
      });

      if (isDuplicate || incoming.readAt) return;
      if (AppState.currentState === 'background') return;
      if (shouldSuppressToast(incoming)) return;
      useToastStore.getState().show(incoming);
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
