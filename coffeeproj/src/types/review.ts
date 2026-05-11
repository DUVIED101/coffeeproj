import type { ApplicationId, ReviewId, UserId } from './ids';

export type RaterRole = 'barista' | 'business';
export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface ApplicationReview {
  id: ReviewId;
  applicationId: ApplicationId;
  raterRole: RaterRole;
  rateeId: UserId;
  rating: StarRating;
  comment?: string;
  createdAt: string;
  // raterId is intentionally absent — never returned by public service paths.
}

export interface CreateReviewData {
  applicationId: ApplicationId;
  raterRole: RaterRole;
  rateeId: UserId;
  rating: StarRating;
  comment?: string;
}

export interface UserReviewAggregate {
  userId: UserId;
  averageRating: number;
  reviewCount: number;
}
