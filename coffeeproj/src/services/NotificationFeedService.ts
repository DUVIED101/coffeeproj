import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { JobOfferId, NotificationId, UserId } from '../types/ids';
import type { Notification, NotificationData, NotificationKind } from '../types/notification';

type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string | null;
  body: string | null;
  data: NotificationData | null;
  read_at: string | null;
  created_at: string;
};

const DEFAULT_LIST_LIMIT = 100;

export interface NotificationFeedServiceProtocol {
  listForUser(userId: UserId, limit?: number): Promise<Notification[]>;
  unreadCount(userId: UserId): Promise<number>;
  markAsRead(notificationId: NotificationId): Promise<void>;
  markAllAsRead(userId: UserId): Promise<void>;
  clearAll(userId: UserId): Promise<void>;
  deleteByOfferId(offerId: JobOfferId): Promise<void>;
  subscribe(userId: UserId, onInsert: (n: Notification) => void): RealtimeChannel;
  unsubscribe(channel: RealtimeChannel): void;
}

export const mapNotificationRow = (row: NotificationRow): Notification => ({
  id: row.id as NotificationId,
  userId: row.user_id as UserId,
  kind: row.kind,
  title: row.title,
  body: row.body,
  data: row.data ?? { kind: row.kind },
  readAt: row.read_at ? new Date(row.read_at) : null,
  createdAt: new Date(row.created_at),
});

export const NotificationFeedService: NotificationFeedServiceProtocol = {
  async listForUser(userId, limit = DEFAULT_LIST_LIMIT) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error in NotificationFeedService.listForUser:', error);
      throw error;
    }

    return (data ?? []).map(row => mapNotificationRow(row as NotificationRow));
  },

  async unreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error in NotificationFeedService.unreadCount:', error);
      throw error;
    }

    return count ?? 0;
  },

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .is('read_at', null);

    if (error) {
      console.error('Error in NotificationFeedService.markAsRead:', error);
      throw error;
    }
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error in NotificationFeedService.markAllAsRead:', error);
      throw error;
    }
  },

  async clearAll(userId) {
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

    if (error) {
      console.error('Error in NotificationFeedService.clearAll:', error);
      throw error;
    }
  },

  async deleteByOfferId(offerId) {
    const { error } = await supabase.from('notifications').delete().contains('data', { offerId });

    if (error) {
      console.error('Error in NotificationFeedService.deleteByOfferId:', error);
      throw error;
    }
  },

  subscribe(userId, onInsert) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          onInsert(mapNotificationRow(payload.new as NotificationRow));
        }
      )
      .subscribe();
  },

  unsubscribe(channel) {
    channel.unsubscribe();
  },
};
