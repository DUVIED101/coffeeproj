import type { Job } from './job';

// Application Types
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  jobId: string;
  baristaId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields (from database queries)
  job?: Job;
}

export interface CreateApplicationData {
  jobId: string;
  baristaId: string;
  coverLetter?: string;
}

export interface UpdateApplicationData {
  status?: ApplicationStatus;
  coverLetter?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  jobId?: string;
  baristaId?: string;
}
