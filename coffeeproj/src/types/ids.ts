type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type ReviewId = Brand<string, 'ReviewId'>;
