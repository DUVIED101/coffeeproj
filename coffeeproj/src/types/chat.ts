import type { ApplicationStatus } from './application';

// Brand utility type for type-safe IDs
type Brand<K, T> = K & { __brand: T };

export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;

export interface Conversation {
  id: ConversationId;
  applicationId: string | null;
  baristaId: string;
  businessId: string;
  lastMessageAt?: string;
  unreadCountBarista: number;
  unreadCountBusiness: number;
  createdAt: string;

  // Joined fields (from database queries)
  jobTitle?: string;
  businessName?: string;
  baristaName?: string;
  applicationStatus?: ApplicationStatus;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  senderId: string;
  messageText: string;
  readByBarista: boolean;
  readByBusiness: boolean;
  createdAt: string;
}

export interface SendMessageData {
  conversationId: ConversationId;
  senderId: string;
  messageText: string;
}
