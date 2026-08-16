import type { Job } from './job';

// Application Types
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

export type ShiftConfirmationStatus = 'pending' | 'confirmed' | 'declined' | 'no_response';

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
  createdViaOffer: boolean;
  createdAt: string;
  updatedAt: string;
  shiftConfirmationStatus?: ShiftConfirmationStatus;
  shiftConfirmationRequestedAt?: string;
  shiftConfirmationRespondedAt?: string;

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

export type DisputeStatus = 'submitted' | 'under_review' | 'resolved' | 'dismissed';

export type DisputeSummary = {
  id: string;
  applicationId: string;
  categories: string[];
  severity: string;
  status: DisputeStatus;
  resolutionNote?: string;
  description?: string;
  createdAt: string;
  myRole: 'reporter' | 'reportee';
};

export type MyDisputeItem = {
  id: string;
  applicationId: string;
  categories: string[];
  severity: string;
  status: DisputeStatus;
  resolutionNote?: string;
  createdAt: string;
  jobTitle?: string;
  businessName?: string;
  myRole: 'reporter' | 'reportee';
};
