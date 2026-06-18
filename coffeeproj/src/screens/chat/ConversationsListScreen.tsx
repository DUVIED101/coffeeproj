import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { COLORS } from '../../config/constants';
import { ChatService } from '../../services/ChatService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { Avatar } from '../../components/Avatar';
import { Skeleton } from '../../components/Skeleton';
import { useMasterDetail } from '../../components/MasterDetailContext';
import { useBlockedUsersStore } from '../../stores/blockedUsersStore';
import type { Conversation } from '../../types/chat';
import type { ApplicationStatus } from '../../types/application';

const ARCHIVED_STATUSES: ReadonlyArray<ApplicationStatus> = ['rejected', 'withdrawn', 'completed'];
const isArchived = (status?: ApplicationStatus): boolean =>
  !!status && ARCHIVED_STATUSES.includes(status);

const AVATAR_SIZE = 48;

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'accepted':
      return '#10B981';
    case 'rejected':
      return '#EF4444';
    case 'pending':
    case 'under_review':
      return '#F59E0B';
    case 'withdrawn':
      return '#6B7280';
    default:
      return COLORS.textSecondary;
  }
};

const ConversationItem = React.memo<{
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  isBarista: boolean;
  currentUserId?: string;
  fallbackTitle: string;
  t: TFunction;
}>(({ conversation, onPress, isBarista, currentUserId, fallbackTitle, t }) => {
  const unreadCount = isBarista
    ? conversation.unreadCountBarista
    : conversation.unreadCountBusiness;

  const otherPartyName = isBarista ? conversation.businessName : conversation.baristaName;
  const otherPartyAvatarUrl = isBarista
    ? conversation.businessLogoUrl
    : conversation.baristaAvatarUrl;
  const title = conversation.jobTitle || otherPartyName || fallbackTitle;
  const showSubtitle = !!otherPartyName && title !== otherPartyName;

  const statusColor = getStatusColor(conversation.applicationStatus);
  const handlePress = useCallback(() => onPress(conversation), [onPress, conversation]);

  const lastMessageSenderLabel = conversation.lastMessageText
    ? conversation.lastMessageSenderId === currentUserId
      ? t('conversations.youPrefix', { defaultValue: 'Вы' })
      : otherPartyName || ''
    : '';

  const a11yLabel = [
    title,
    otherPartyName && otherPartyName !== title ? otherPartyName : null,
    unreadCount > 0 ? t('conversations.unreadA11y', { count: unreadCount }) : null,
    conversation.lastMessageText,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}>
      <View style={styles.conversationHeader}>
        <Avatar size={AVATAR_SIZE} uri={otherPartyAvatarUrl} name={otherPartyName} />
        <View style={styles.conversationInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {title}
          </Text>
          {showSubtitle && (
            <Text style={styles.otherPartyName} numberOfLines={1}>
              {otherPartyName}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {conversation.lastMessageText && (
        <Text style={styles.lastMessagePreview} numberOfLines={2}>
          {lastMessageSenderLabel ? `${lastMessageSenderLabel}: ` : ''}
          {conversation.lastMessageText}
        </Text>
      )}

      <View style={styles.conversationFooter}>
        {conversation.applicationStatus && (
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
        {conversation.lastMessageAt && (
          <Text style={styles.lastMessageTime}>
            {new Date(conversation.lastMessageAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}{' '}
            {new Date(conversation.lastMessageAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

export function ConversationsListScreen({ navigation }: any) {
  const user = useAuthStore(state => state.user);
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  const { t } = useTranslation();
  const masterDetail = useMasterDetail();
  const blockedUsers = useBlockedUsersStore(s => s.blocked);
  const hydrateBlocked = useBlockedUsersStore(s => s.hydrate);
  useEffect(() => {
    void hydrateBlocked();
  }, [hydrateBlocked]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [archiveTab, setArchiveTab] = useState<'active' | 'archive'>('active');

  const loadConversations = useCallback(async () => {
    if (!user?.id || !user?.accountType) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await ChatService.getConversations(user.id, user.accountType);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.accountType]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
  };

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      if (masterDetail) {
        masterDetail.select(conversation.id);
        return;
      }
      navigation.navigate('Chat', {
        applicationId: conversation.applicationId,
        conversationId: conversation.id,
      });
    },
    [navigation, masterDetail]
  );

  const fallbackTitle = t('chat.fallbackTitle', { defaultValue: 'Chat' });

  const blockedIds = useMemo(() => new Set(blockedUsers.map(b => b.userId)), [blockedUsers]);
  const isBarista = user?.accountType === 'barista';
  const visibleConversations = useMemo(
    () =>
      conversations
        .filter(c => {
          const otherPartyId = isBarista ? c.businessId : c.baristaId;
          return !blockedIds.has(otherPartyId);
        })
        .filter(c =>
          archiveTab === 'archive'
            ? isArchived(c.applicationStatus)
            : !isArchived(c.applicationStatus)
        ),
    [conversations, archiveTab, blockedIds, isBarista]
  );

  const archiveCount = useMemo(
    () => conversations.filter(c => isArchived(c.applicationStatus)).length,
    [conversations]
  );
  const activeCount = conversations.length - archiveCount;

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={handleConversationPress}
        isBarista={user?.accountType === 'barista'}
        currentUserId={user?.id}
        fallbackTitle={fallbackTitle}
        t={t}
      />
    ),
    [handleConversationPress, user?.accountType, user?.id, fallbackTitle, t]
  );

  const renderEmpty = () => {
    if (archiveTab === 'archive') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('conversations.emptyArchive', { defaultValue: 'В архиве пусто' })}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('conversations.emptyTitle', { defaultValue: 'No conversations yet' })}
        </Text>
        <Text style={styles.emptySubtext}>
          {user?.accountType === 'barista'
            ? t('conversations.emptyBarista', {
                defaultValue: 'Apply to jobs to start conversations with businesses',
              })
            : t('conversations.emptyBusiness', {
                defaultValue: 'Conversations will appear here when baristas apply to your jobs',
              })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
              <View style={styles.skeletonRowText}>
                <Skeleton width="55%" height={15} />
                <Skeleton width="80%" height={13} style={styles.skeletonGap} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScreenHeaderWithActions
        title={t('chats.title')}
        actions={[
          {
            icon: 'bell-outline',
            badgeCount: unreadCount,
            onPress: () => navigation.navigate('NotificationFeed'),
            testID: 'bell',
          },
        ]}
      />

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, archiveTab === 'active' && styles.tabActive]}
          onPress={() => setArchiveTab('active')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, archiveTab === 'active' && styles.tabTextActive]}>
            {t('conversations.tabActive', { count: activeCount, defaultValue: 'Активные' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, archiveTab === 'archive' && styles.tabActive]}
          onPress={() => setArchiveTab('archive')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, archiveTab === 'archive' && styles.tabTextActive]}>
            {t('conversations.tabArchive', { count: archiveCount, defaultValue: 'Архив' })}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleConversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

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
    paddingVertical: 12,
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  otherPartyName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  lastMessagePreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastMessageTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
