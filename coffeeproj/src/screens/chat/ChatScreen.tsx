import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FlatList } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FlatList as FlatListComponent } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { ChatService } from '../../services/ChatService';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import type { HeaderAction } from '../../components/ScreenHeaderWithActions';
import { useAuthStore } from '../../stores/authStore';
import type { Message, ConversationId, Conversation } from '../../types/chat';
import { formatDateHeader, isSameDay } from '../../utils/dateUtils';

const DateHeader = React.memo<{ date: string }>(({ date }) => {
  return (
    <View style={styles.dateHeaderContainer}>
      <View style={styles.dateHeaderLine} />
      <Text style={styles.dateHeaderText}>{date}</Text>
      <View style={styles.dateHeaderLine} />
    </View>
  );
});

const MessageBubble = React.memo<{
  message: Message;
  isOwnMessage: boolean;
}>(({ message, isOwnMessage }) => {
  return (
    <View
      style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
      ]}>
      <Text
        style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
        ]}>
        {message.messageText}
      </Text>
      <Text
        style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
        ]}>
        {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
});

export function ChatScreen({ navigation, route }: any) {
  const { applicationId, conversationId: initialConversationId } = route.params;
  const user = useAuthStore(state => state.user);
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const loadConversationAndMessages = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      let conv: Conversation | null = null;

      if (initialConversationId && !applicationId) {
        conv = await ChatService.getConversationById(initialConversationId as ConversationId);
      } else {
        conv = await ChatService.getConversationByApplication(applicationId);

        if (!conv) {
          console.log('Conversation not found, creating one for application:', applicationId);
          conv = await ChatService.createConversation(applicationId);
        }
      }

      if (!conv) {
        return;
      }

      setConversation(conv);

      const msgs = await ChatService.getMessages(conv.id);
      setMessages(msgs.reverse());

      await ChatService.markAsRead(conv.id, user.id);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, initialConversationId, user?.id]);

  useEffect(() => {
    loadConversationAndMessages();
  }, [loadConversationAndMessages]);

  useEffect(() => {
    const businessOwnerId = conversation?.businessId;
    const businessName = conversation?.businessName;
    const actions: HeaderAction[] | undefined =
      user?.accountType === 'barista' && businessOwnerId
        ? [
            {
              label: 'Вакансии',
              onPress: () => navigation.navigate('BusinessJobs', { businessOwnerId, businessName }),
            },
          ]
        : undefined;
    const otherPartyName =
      user?.accountType === 'barista' ? businessName : conversation?.baristaName;
    const title = otherPartyName || conversation?.jobTitle || 'Chat';
    navigation.setOptions({
      header: () => (
        <ScreenHeaderWithActions
          title={title}
          onBack={() => navigation.goBack()}
          actions={actions}
        />
      ),
    });
  }, [
    navigation,
    user?.accountType,
    conversation?.businessId,
    conversation?.businessName,
    conversation?.baristaName,
    conversation?.jobTitle,
  ]);

  const conversationId = conversation?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!conversationId || !userId) return;

    if (realtimeChannelRef.current) {
      ChatService.unsubscribeFromMessages(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = ChatService.subscribeToMessages(conversationId, newMessage => {
      setMessages(prevMessages => [...prevMessages, newMessage]);

      if (newMessage.senderId !== userId) {
        ChatService.markAsRead(conversationId, userId).catch(error => {
          console.error('Error marking message as read:', error);
        });
      }
    });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        ChatService.unsubscribeFromMessages(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [conversationId, userId]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !conversation || !user?.id || isSending) {
      return;
    }

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      const sentMessage = await ChatService.sendMessage({
        conversationId: conversation.id,
        senderId: user.id,
        messageText: textToSend,
      });

      // Add the sent message to local state immediately.
      // FlatList onContentSizeChange below will scroll to end.
      setMessages(prevMessages => [...prevMessages, sentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(textToSend);
    } finally {
      setIsSending(false);
    }
  }, [messageText, conversation, user?.id, isSending]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isOwnMessage = item.senderId === user?.id;
      const currentMessageDate = new Date(item.createdAt);

      // Show date header if this is the first message or the date changed
      let showDateHeader = false;
      if (index === 0) {
        showDateHeader = true;
      } else {
        const prevMessageDate = new Date(messages[index - 1].createdAt);
        showDateHeader = !isSameDay(currentMessageDate, prevMessageDate);
      }

      return (
        <>
          {showDateHeader && <DateHeader date={formatDateHeader(currentMessageDate)} />}
          <MessageBubble message={item} isOwnMessage={isOwnMessage} />
        </>
      );
    },
    [user?.id, messages]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
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

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isChatClosed =
    conversation.applicationStatus === 'rejected' || conversation.applicationStatus === 'withdrawn';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation.jobTitle || 'Chat'}
          </Text>
          {user?.accountType === 'barista' && conversation.businessName && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {conversation.businessName}
            </Text>
          )}
        </View>

        <FlatListComponent
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {isChatClosed ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerTitle}>{t('chat.closed.title')}</Text>
            <Text style={styles.closedBannerSubtitle}>
              {conversation.applicationStatus === 'withdrawn'
                ? t('chat.closed.cancelled')
                : t('chat.closed.rejected')}
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={2000}
              editable={!isSending}
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              keyboardType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}>
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateHeaderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 8,
  },
  ownMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextWithAttachment: {
    marginTop: 8,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  filePreviewContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  filePreviewIcon: {
    marginRight: 12,
  },
  filePreviewName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  fileRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: COLORS.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closedBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  closedBannerSubtitle: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
  },
});
