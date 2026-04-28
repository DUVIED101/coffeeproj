import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { ChatService } from '../../services/ChatService';
import { useAuthStore } from '../../stores/authStore';
import type { Conversation } from '../../types/chat';

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
}>(({ conversation, onPress, isBarista }) => {
  const unreadCount = isBarista
    ? conversation.unreadCountBarista
    : conversation.unreadCountBusiness;

  const otherPartyName = isBarista ? conversation.businessName : conversation.baristaName;
  const title = conversation.jobTitle || otherPartyName || 'Chat';
  const showSubtitle = !!otherPartyName && title !== otherPartyName;

  const statusColor = getStatusColor(conversation.applicationStatus);
  const handlePress = useCallback(() => onPress(conversation), [onPress, conversation]);

  return (
    <TouchableOpacity style={styles.conversationCard} onPress={handlePress}>
      <View style={styles.conversationHeader}>
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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      navigation.navigate('Chat', {
        applicationId: conversation.applicationId,
        conversationId: conversation.id,
      });
    },
    [navigation]
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={handleConversationPress}
        isBarista={user?.accountType === 'barista'}
      />
    ),
    [handleConversationPress, user?.accountType]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No conversations yet</Text>
      <Text style={styles.emptySubtext}>
        {user?.accountType === 'barista'
          ? 'Apply to jobs to start conversations with businesses'
          : 'Conversations will appear here when baristas apply to your jobs'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
      </View>

      <FlatList
        data={conversations}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
