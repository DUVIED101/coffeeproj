import type { UserId } from './ids';

export type NotificationKindPref =
  | 'new_message'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_application'
  | 'application_withdrawn'
  | 'shift_cancelled'
  | 'new_review'
  | 'conversation_started'
  | 'job_offer_received'
  | 'job_offer_accepted'
  | 'job_offer_declined'
  | 'work_completion_requested'
  | 'work_completion_confirmed';

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
  jobOfferReceived: boolean;
  jobOfferAccepted: boolean;
  jobOfferDeclined: boolean;
  workCompletionRequested: boolean;
  workCompletionConfirmed: boolean;
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
    | 'jobOfferReceived'
    | 'jobOfferAccepted'
    | 'jobOfferDeclined'
    | 'workCompletionRequested'
    | 'workCompletionConfirmed'
  >
>;
