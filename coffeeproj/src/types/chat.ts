import type { ApplicationStatus } from './application';
import type { CityCode } from './city';

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
  businessLogoUrl?: string;
  baristaName?: string;
  baristaAvatarUrl?: string;
  applicationStatus?: ApplicationStatus;
  city?: CityCode;
  metroStation?: string;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  firstBusinessMessageAt?: string | null;
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
