import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FlatList } from 'react-native';
import {
  ActionSheetIOS,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
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
import { useChatUnreadStore } from '../../stores/chatUnreadStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import type { UserId } from '../../types/ids';
import type { Message, ConversationId, Conversation } from '../../types/chat';
import { formatDateHeader, isSameDay } from '../../utils/dateUtils';
import { clampToEffectiveLength } from '../../utils/textLength';
import { useReportSheet } from '../../hooks/useReportSheet';
import { handleApiError } from '../../utils/handleApiError';

const MESSAGE_MAX_LENGTH = 500;

// Matches http(s)://… and bare www.… so users typing either get tappable links.
// Trailing punctuation that's typically sentence-final (.,!?;:) is intentionally
// excluded from the URL so "see https://foo.com." doesn't include the period.
const URL_REGEX = /(https?:\/\/[^\s]+[^\s.,!?;:]|www\.[^\s]+[^\s.,!?;:])/gi;

const openUrl = async (raw: string): Promise<void> => {
  const url = raw.startsWith('www.') ? `https://${raw}` : raw;
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening URL:', error);
  }
};

const renderMessageWithLinks = (text: string, linkTextStyle: object): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    parts.push(
      <Text
        key={`url-${start}`}
        style={linkTextStyle}
        onPress={() => openUrl(url)}
        suppressHighlighting>
        {url}
      </Text>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 0 ? [text] : parts;
};

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
  onLongPress?: () => void;
}>(({ message, isOwnMessage, onLongPress }) => {
  const linkTextStyle = isOwnMessage ? styles.ownMessageLink : styles.otherMessageLink;
  return (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={onLongPress}
      delayLongPress={300}
      // Without an onPress the TouchableOpacity still triggers ripple; passing a
      // noop keeps Android happy. iOS ignores.
      onPress={() => {}}
      style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
      ]}>
      <Text
        selectable
        style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
        ]}>
        {renderMessageWithLinks(message.messageText, linkTextStyle)}
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
    </TouchableOpacity>
  );
});

export function ChatScreen({ navigation, route }: any) {
  const { applicationId, conversationId: initialConversationId } = route.params;
  const user = useAuthStore(state => state.user);
  const refreshChatUnread = useChatUnreadStore(s => s.refresh);
  const markConversationNotificationsRead = useNotificationFeedStore(s => s.markConversationAsRead);
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const textInputRef = useRef<TextInput>(null);

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
      markConversationNotificationsRead(user.id as UserId, conv.id).catch(error => {
        console.error('Error marking conversation notifications as read:', error);
      });
      if (user.accountType) {
        refreshChatUnread(user.id, user.accountType).catch(error => {
          console.error('Error refreshing chat unread count:', error);
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    applicationId,
    initialConversationId,
    user?.id,
    user?.accountType,
    refreshChatUnread,
    markConversationNotificationsRead,
  ]);

  useEffect(() => {
    loadConversationAndMessages();
  }, [loadConversationAndMessages]);

  useEffect(() => {
    // When the keyboard appears, the FlatList loses its bottom area to it;
    // jump back to the latest message so the most recent context stays visible.
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const businessOwnerId = conversation?.businessId;
    const businessName = conversation?.businessName;
    const baristaId = conversation?.baristaId;
    let actions: HeaderAction[] | undefined;
    let onAvatarPress: (() => void) | undefined;
    if (user?.accountType === 'barista' && businessOwnerId) {
      onAvatarPress = () => navigation.navigate('BusinessPublicProfile', { businessOwnerId });
      actions = [
        {
          label: t('chat.headerJobsAction', { defaultValue: 'Вакансии' }),
          onPress: () => navigation.navigate('BusinessJobs', { businessOwnerId, businessName }),
        },
      ];
    } else if (user?.accountType === 'business' && baristaId) {
      onAvatarPress = () => navigation.navigate('ViewBaristaProfile', { baristaId });
    }
    const otherPartyName =
      user?.accountType === 'barista' ? businessName : conversation?.baristaName;
    const otherPartyAvatarUrl =
      user?.accountType === 'barista'
        ? conversation?.businessLogoUrl
        : conversation?.baristaAvatarUrl;
    const title =
      otherPartyName || conversation?.jobTitle || t('chat.fallbackTitle', { defaultValue: 'Chat' });
    navigation.setOptions({
      header: () => (
        <ScreenHeaderWithActions
          title={title}
          onBack={() => navigation.goBack()}
          actions={actions}
          avatarUri={otherPartyAvatarUrl}
          avatarName={otherPartyName}
          onAvatarPress={onAvatarPress}
        />
      ),
    });
  }, [
    navigation,
    user?.accountType,
    conversation?.businessId,
    conversation?.businessName,
    conversation?.businessLogoUrl,
    conversation?.baristaId,
    conversation?.baristaName,
    conversation?.baristaAvatarUrl,
    conversation?.jobTitle,
    t,
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
      setMessages(prevMessages => {
        if (prevMessages.some(m => m.id === newMessage.id)) return prevMessages;
        return [...prevMessages, newMessage];
      });

      if (newMessage.senderId !== userId) {
        ChatService.markAsRead(conversationId, userId)
          .then(() => {
            if (user?.accountType) {
              return refreshChatUnread(userId, user.accountType);
            }
          })
          .catch(error => {
            console.error('Error marking message as read:', error);
          });
        markConversationNotificationsRead(userId as UserId, conversationId).catch(error => {
          console.error('Error marking conversation notifications as read:', error);
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
  }, [
    conversationId,
    userId,
    user?.accountType,
    refreshChatUnread,
    markConversationNotificationsRead,
  ]);

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
      // Keep keyboard open and focus on input so the user can keep typing.
      textInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(textToSend);
      void handleApiError(error);
    } finally {
      setIsSending(false);
    }
  }, [messageText, conversation, user?.id, isSending]);

  const { open: openReportSheet, sheet: reportSheet } = useReportSheet();

  const handleLongPressMessage = useCallback(
    (messageId: string) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('chat.report.actionSheetTitle'),
          options: [t('report.buttonLabel'), t('report.cancel')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        index => {
          if (index === 0) openReportSheet({ type: 'message', id: messageId });
        }
      );
    },
    [t, openReportSheet]
  );

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
          <MessageBubble
            message={item}
            isOwnMessage={isOwnMessage}
            onLongPress={isOwnMessage ? undefined : () => handleLongPressMessage(item.id)}
          />
        </>
      );
    },
    [user?.id, messages, handleLongPressMessage]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {t('chat.emptyTitle', { defaultValue: 'No messages yet' })}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('chat.emptySubtitle', { defaultValue: 'Send a message to start the conversation' })}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t('chat.loadFailed', { defaultValue: 'Conversation not found' })}
          </Text>
        </View>
      </View>
    );
  }

  const isChatClosed =
    conversation.applicationStatus === 'rejected' || conversation.applicationStatus === 'withdrawn';

  // Server-side gate (migration 065): barista cannot send messages until the
  // business has spoken. Surface this in the UI instead of letting the send
  // fail silently. Also check the locally-loaded messages so the banner lifts
  // immediately when the business writes via realtime.
  const businessHasMessaged =
    Boolean(conversation.firstBusinessMessageAt) ||
    messages.some(m => m.senderId === conversation.businessId);
  const mustWaitForBusiness =
    user?.accountType === 'barista' &&
    !businessHasMessaged &&
    conversation.applicationStatus !== 'accepted';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <FlatListComponent
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
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
      ) : mustWaitForBusiness ? (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerTitle}>{t('chat.waitingForBusiness.title')}</Text>
          <Text style={styles.closedBannerSubtitle}>{t('chat.waitingForBusiness.subtitle')}</Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={messageText}
            onChangeText={text => setMessageText(clampToEffectiveLength(text, MESSAGE_MAX_LENGTH))}
            placeholder={t('chat.inputPlaceholder', { defaultValue: 'Type a message...' })}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            blurOnSubmit={false}
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
              <Text style={styles.sendButtonText}>{t('chat.send', { defaultValue: 'Send' })}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {reportSheet}
    </KeyboardAvoidingView>
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
  messagesContainer: {
    flex: 1,
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
  ownMessageLink: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  otherMessageLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
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
