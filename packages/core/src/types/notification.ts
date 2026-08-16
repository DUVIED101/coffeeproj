import type { ConversationId } from './chat';
import type {
  ApplicationId,
  DisputeId,
  JobId,
  JobOfferId,
  NotificationId,
  ReviewId,
  UserId,
} from './ids';

type Brand<K, T> = K & { __brand: T };

export type DeviceToken = Brand<string, 'DeviceToken'>;
export type ApnsEnvironment = 'sandbox' | 'production';

export type NotificationKind =
  | 'new_message'
  | 'application_accepted'
  | 'application_rejected'
  | 'work_completion_requested'
  | 'work_completion_confirmed'
  | 'new_application'
  | 'application_withdrawn'
  | 'shift_cancelled'
  | 'new_review'
  | 'conversation_started'
  | 'job_offer_received'
  | 'job_offer_accepted'
  | 'job_offer_declined'
  | 'shift_reminder_24h'
  | 'shift_reminder_3h'
  | 'shift_confirmation_required'
  | 'shift_confirmed'
  | 'shift_declined'
  | 'shift_no_response_alert'
  | 'dispute_filed';

export const JOB_OFFER_ACTION_ACCEPT = 'JOB_OFFER_ACCEPT';
export const JOB_OFFER_ACTION_DECLINE = 'JOB_OFFER_DECLINE';
export type JobOfferActionId = typeof JOB_OFFER_ACTION_ACCEPT | typeof JOB_OFFER_ACTION_DECLINE;

export type PushNotificationPayload = {
  kind: NotificationKind;
  title?: string;
  body?: string;
  /** True when the user tapped the notification; false for foreground arrivals. */
  userInteraction?: boolean;
  /** Set when the user taps a UNNotificationAction button (e.g. Интересно/Неинтересно). */
  actionIdentifier?: string;
  data?: {
    kind: NotificationKind;
    applicationId?: ApplicationId;
    conversationId?: ConversationId;
    jobId?: JobId;
    reviewId?: ReviewId;
    offerId?: JobOfferId;
    disputeId?: DisputeId;
    jobTitle?: string;
    shiftStartIso?: string;
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
