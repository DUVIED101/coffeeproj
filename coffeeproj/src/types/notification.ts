import type { ConversationId } from './chat';
import type { ApplicationId, NotificationId, UserId } from './ids';

type Brand<K, T> = K & { __brand: T };

export type DeviceToken = Brand<string, 'DeviceToken'>;
export type ApnsEnvironment = 'sandbox' | 'production';

export type NotificationKind =
  | 'new_message'
  | 'application_accepted'
  | 'application_rejected'
  | 'work_completion_requested'
  | 'work_completion_confirmed';

export type PushNotificationPayload = {
  kind: NotificationKind;
  title?: string;
  body?: string;
  /** True when the user tapped the notification; false for foreground arrivals. */
  userInteraction?: boolean;
  data?: {
    kind: NotificationKind;
    applicationId?: ApplicationId;
    conversationId?: ConversationId;
  };
};

export type ApnsTokenRow = {
  id: string;
  userId: UserId;
  deviceToken: DeviceToken;
  environment: ApnsEnvironment;
  lastSeenAt: string;
  createdAt: string;
};

export type NotificationData = NonNullable<PushNotificationPayload['data']>;

export type Notification = {
  id: NotificationId;
  userId: UserId;
  kind: NotificationKind;
  title: string | null;
  body: string | null;
  data: NotificationData;
  readAt: Date | null;
  createdAt: Date;
};
