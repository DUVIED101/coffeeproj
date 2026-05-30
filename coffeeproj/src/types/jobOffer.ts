import type { ApplicationId, JobId, JobOfferId, UserId } from './ids';
import type { Job } from './job';

export type JobOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface JobOffer {
  id: JobOfferId;
  businessOwnerId: UserId;
  baristaId: UserId;
  jobId: JobId;
  message: string | null;
  status: JobOfferStatus;
  applicationId: ApplicationId | null;
  createdAt: string;
  respondedAt: string | null;

  job?: Job;
  baristaFirstName?: string;
  baristaLastName?: string;
  baristaAvatarUrl?: string | null;
  businessName?: string;
  businessLogoUrl?: string | null;
}

export interface CreateJobOfferData {
  businessOwnerId: UserId;
  baristaId: UserId;
  jobId: JobId;
  message?: string;
}

export type RespondToJobOfferResult =
  | { status: 'accepted'; applicationId: ApplicationId }
  | { status: 'declined' };
