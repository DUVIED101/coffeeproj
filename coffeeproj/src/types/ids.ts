type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type ReviewId = Brand<string, 'ReviewId'>;
export type BaristaProfileId = Brand<string, 'BaristaProfileId'>;
export type WorkExperienceId = Brand<string, 'WorkExperienceId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type JobId = Brand<string, 'JobId'>;
