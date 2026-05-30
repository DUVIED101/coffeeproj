import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
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
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { dispatchPayload } from '../../navigation/navigationRef';
import type { Notification, NotificationKind } from '../../types/notification';
import type { UserId } from '../../types/ids';

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

export const NotificationFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id) as UserId | undefined;
  const notifications = useNotificationFeedStore(state => state.notifications);
  const isLoading = useNotificationFeedStore(state => state.isLoading);
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  const load = useNotificationFeedStore(state => state.load);
  const markAsRead = useNotificationFeedStore(state => state.markAsRead);
  const markAllAsRead = useNotificationFeedStore(state => state.markAllAsRead);
  const clearAll = useNotificationFeedStore(state => state.clearAll);

  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard notification={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>{t('notifications.feed.empty')}</Text>
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
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyListContent : styles.listContent
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
