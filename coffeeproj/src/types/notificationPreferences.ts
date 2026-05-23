import type { UserId } from './ids';

export type NotificationKindPref =
  | 'new_message'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_application'
  | 'application_withdrawn'
  | 'shift_cancelled'
  | 'new_review'
  | 'conversation_started';

export type NotificationPreferences = {
  userId: UserId;
  newMessage: boolean;
  applicationAccepted: boolean;
  applicationRejected: boolean;
  newApplication: boolean;
  applicationWithdrawn: boolean;
  shiftCancelled: boolean;
  newReview: boolean;
  conversationStarted: boolean;
  updatedAt: string;
};

export type UpdateNotificationPreferences = Partial<
  Pick<
    NotificationPreferences,
    | 'newMessage'
    | 'applicationAccepted'
    | 'applicationRejected'
    | 'newApplication'
    | 'applicationWithdrawn'
    | 'shiftCancelled'
    | 'newReview'
    | 'conversationStarted'
  >
>;
