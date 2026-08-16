import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/constants';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { Skeleton } from '../../components/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { dispatchPayload } from '../../navigation/navigationRef';
import type { Notification, NotificationKind } from '../../types/notification';
import type { UserId } from '../../types/ids';
import type { ConversationId } from '../../types/chat';

type FeedItem =
  | { type: 'single'; notification: Notification }
  | { type: 'group'; conversationId: ConversationId; items: Notification[] };

const groupChatNotifications = (notifications: Notification[]): FeedItem[] => {
  const result: FeedItem[] = [];
  let i = 0;
  while (i < notifications.length) {
    const current = notifications[i];
    const convId = current.data.conversationId as ConversationId | undefined;
    if (current.kind !== 'new_message' || !convId) {
      result.push({ type: 'single', notification: current });
      i++;
      continue;
    }
    let j = i;
    while (
      j < notifications.length &&
      notifications[j].kind === 'new_message' &&
      (notifications[j].data.conversationId as ConversationId | undefined) === convId
    ) {
      j++;
    }
    const run = notifications.slice(i, j);
    if (run.length === 1) {
      result.push({ type: 'single', notification: run[0] });
    } else {
      result.push({ type: 'group', conversationId: convId, items: run });
    }
    i = j;
  }
  return result;
};

const ICON_BY_KIND: Record<NotificationKind, string> = {
  new_message: 'message-text-outline',
  application_accepted: 'check-circle-outline',
  application_rejected: 'close-circle-outline',
  work_completion_requested: 'clock-outline',
  work_completion_confirmed: 'briefcase-check-outline',
  new_application: 'account-plus-outline',
  application_withdrawn: 'account-remove-outline',
  shift_cancelled: 'calendar-remove-outline',
  new_review: 'star-outline',
  conversation_started: 'message-plus-outline',
  job_offer_received: 'briefcase-plus-outline',
  job_offer_accepted: 'briefcase-check-outline',
  job_offer_declined: 'briefcase-remove-outline',
  shift_reminder_24h: 'calendar-clock',
  shift_reminder_3h: 'calendar-clock',
  shift_confirmation_required: 'calendar-question',
  shift_confirmed: 'calendar-check',
  shift_declined: 'calendar-remove-outline',
  shift_no_response_alert: 'calendar-alert',
  dispute_filed: 'alert-circle-outline',
};

const formatTimestamp = (date: Date): string => {
  const datePart = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const timePart = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
};

type NotificationCardProps = {
  notification: Notification;
  onPress: (n: Notification) => void;
};

const NotificationCard = React.memo<NotificationCardProps>(({ notification, onPress }) => {
  const handlePress = useCallback(() => onPress(notification), [onPress, notification]);
  const isUnread = !notification.readAt;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={ICON_BY_KIND[notification.kind]}
          size={22}
          color={COLORS.primary}
        />
        {isUnread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.body}>
        {notification.title && (
          <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
            {notification.title}
          </Text>
        )}
        {notification.body && (
          <Text style={styles.bodyText} numberOfLines={3}>
            {notification.body}
          </Text>
        )}
        <Text style={styles.timestamp}>{formatTimestamp(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
});

type GroupCardProps = {
  items: Notification[];
  expanded: boolean;
  onToggle: () => void;
  onPress: (items: Notification[]) => void;
  onChildPress: (n: Notification) => void;
};

const GroupCard = React.memo<GroupCardProps>(
  ({ items, expanded, onToggle, onPress, onChildPress }) => {
    const { t } = useTranslation();
    const latest = items[0];
    const hasUnread = items.some(n => !n.readAt);
    const handlePress = useCallback(() => onPress(items), [onPress, items]);

    return (
      <View style={[styles.groupCardOuter, hasUnread && styles.cardUnread]}>
        <View style={styles.groupHeaderRow}>
          <TouchableOpacity
            style={styles.groupHeaderTappable}
            onPress={handlePress}
            activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={22}
                color={COLORS.primary}
              />
              {hasUnread && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.body}>
              {latest.title && (
                <Text
                  style={[styles.title, hasUnread && styles.titleUnread]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {latest.title}
                </Text>
              )}
              <Text style={styles.bodyText} numberOfLines={1}>
                {t('notifications.feed.chatGroupBody', { count: items.length })}
              </Text>
              <Text style={styles.timestamp}>{formatTimestamp(latest.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={onToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t(
              expanded
                ? 'notifications.feed.collapseGroupA11y'
                : 'notifications.feed.expandGroupA11y'
            )}>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {expanded && (
          <View style={styles.groupChildren}>
            {items.map(child => {
              const childIsUnread = !child.readAt;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={styles.groupChildRow}
                  onPress={() => onChildPress(child)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.groupChildUnreadDot,
                      !childIsUnread && styles.groupChildUnreadDotHidden,
                    ]}
                  />
                  <View style={styles.body}>
                    {child.body && (
                      <Text style={styles.groupChildText} numberOfLines={3}>
                        {child.body}
                      </Text>
                    )}
                    <Text style={styles.timestamp}>{formatTimestamp(child.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }
);

export const NotificationFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id) as UserId | undefined;
  const notifications = useNotificationFeedStore(state => state.notifications);
  const isLoading = useNotificationFeedStore(state => state.isLoading);
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  const load = useNotificationFeedStore(state => state.load);
  const markAsRead = useNotificationFeedStore(state => state.markAsRead);
  const markAllAsRead = useNotificationFeedStore(state => state.markAllAsRead);
  const markConversationAsRead = useNotificationFeedStore(state => state.markConversationAsRead);
  const clearAll = useNotificationFeedStore(state => state.clearAll);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        load(userId).catch(err => console.error('Error loading notifications:', err));
      }
    }, [userId, load])
  );

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setIsRefreshing(true);
    try {
      await load(userId);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, load]);

  const handleMarkAllRead = useCallback(() => {
    if (!userId) return;
    markAllAsRead(userId).catch(err => console.error('Error marking all read:', err));
  }, [userId, markAllAsRead]);

  const handleClearAll = useCallback(() => {
    if (!userId) return;
    Alert.alert(
      t('notifications.feed.clearConfirmTitle'),
      t('notifications.feed.clearConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.feed.clearAll'),
          style: 'destructive',
          onPress: () => {
            clearAll(userId).catch(err => console.error('Error clearing notifications:', err));
          },
        },
      ]
    );
  }, [userId, clearAll, t]);

  const handlePress = useCallback(
    (n: Notification) => {
      markAsRead(n.id).catch(err => console.error('Error marking notification read:', err));
      dispatchPayload({
        kind: n.kind,
        title: n.title ?? undefined,
        body: n.body ?? undefined,
        userInteraction: true,
        data: n.data,
      });
    },
    [markAsRead]
  );

  const handleGroupPress = useCallback(
    (items: Notification[]) => {
      const latest = items[0];
      const convId = latest.data.conversationId as ConversationId | undefined;
      if (userId && convId) {
        markConversationAsRead(userId, convId).catch(err =>
          console.error('Error marking conversation read:', err)
        );
      }
      dispatchPayload({
        kind: latest.kind,
        title: latest.title ?? undefined,
        body: latest.body ?? undefined,
        userInteraction: true,
        data: latest.data,
      });
    },
    [userId, markConversationAsRead]
  );

  const visibleNotifications = unreadOnly ? notifications.filter(n => !n.readAt) : notifications;
  const feedItems = groupChatNotifications(visibleNotifications);

  const toggleGroup = useCallback((conversationId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) =>
      item.type === 'group' ? (
        <GroupCard
          items={item.items}
          expanded={expandedGroups.has(item.conversationId)}
          onToggle={() => toggleGroup(item.conversationId)}
          onPress={handleGroupPress}
          onChildPress={handlePress}
        />
      ) : (
        <NotificationCard notification={item.notification} onPress={handlePress} />
      ),
    [handlePress, handleGroupPress, expandedGroups, toggleGroup]
  );

  const keyForItem = useCallback(
    (item: FeedItem) =>
      item.type === 'group'
        ? `group:${item.conversationId}:${item.items[0].id}`
        : item.notification.id,
    []
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>
        {t(unreadOnly ? 'notifications.feed.emptyUnread' : 'notifications.feed.empty')}
      </Text>
    </View>
  );

  const headerActions = [
    ...(unreadCount > 0
      ? [{ label: t('notifications.feed.markAllRead'), onPress: handleMarkAllRead }]
      : []),
    ...(notifications.length > 0
      ? [
          {
            icon: 'trash-can-outline',
            onPress: handleClearAll,
            testID: 'clear-all',
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScreenHeaderWithActions
        title={t('notifications.feed.title')}
        onBack={() => navigation.goBack()}
        actions={headerActions.length > 0 ? headerActions : undefined}
      />
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !unreadOnly && styles.filterChipActive]}
          onPress={() => setUnreadOnly(false)}
          activeOpacity={0.7}>
          <Text style={[styles.filterChipText, !unreadOnly && styles.filterChipTextActive]}>
            {t('notifications.feed.filterAll')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, unreadOnly && styles.filterChipActive]}
          onPress={() => setUnreadOnly(true)}
          activeOpacity={0.7}>
          <Text style={[styles.filterChipText, unreadOnly && styles.filterChipTextActive]}>
            {t('notifications.feed.filterUnread', { count: unreadCount })}
          </Text>
        </TouchableOpacity>
      </View>
      {isLoading && notifications.length === 0 ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={36} height={36} borderRadius={18} />
              <View style={styles.skeletonRowText}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="85%" height={13} style={styles.skeletonGap} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyForItem}
          contentContainerStyle={
            feedItems.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  skeletonRowText: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: 6,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardUnread: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  groupCardOuter: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeaderTappable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  groupChildren: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  groupChildRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  groupChildUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    marginTop: 6,
    marginRight: 10,
  },
  groupChildUnreadDotHidden: {
    backgroundColor: 'transparent',
  },
  groupChildText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});
