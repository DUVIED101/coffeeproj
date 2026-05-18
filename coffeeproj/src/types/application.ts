import type { Job } from './job';

// Application Types
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

// Lifecycle status used by the Business "Смены" dashboard.
// Combines job + application + clock-time into a single state focused
// on what the business needs to do next for the shift.
export type ShiftLifecycleStatus =
  | 'open'
  | 'under_review'
  | 'accepted'
  | 'in_progress'
  | 'completed';

export interface Application {
  id: string;
  jobId: string;
  baristaId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  completedByBarista: boolean;
  completedByBusiness: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields (from database queries)
  job?: Job;
  baristaEmail?: string; // For business view of applicants
  baristaProfile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    equipmentExperience: string[];
    yearsOfExperience?: number;
  };
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
