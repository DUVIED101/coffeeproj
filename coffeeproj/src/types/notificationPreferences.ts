import type { UserId } from './ids';

export type NotificationKindPref = 'new_message' | 'application_accepted' | 'application_rejected';

export type NotificationPreferences = {
  userId: UserId;
  newMessage: boolean;
  applicationAccepted: boolean;
  applicationRejected: boolean;
  updatedAt: string;
};

export type UpdateNotificationPreferences = Partial<
  Pick<NotificationPreferences, 'newMessage' | 'applicationAccepted' | 'applicationRejected'>
>;
