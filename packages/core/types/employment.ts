import type { ApplicationId, EmploymentId, JobId, UserId } from './ids';
import type { JobType, ShiftDetails, Compensation, JobStatus } from './job';

// Tracked permanent hire (найм в штат). Lifecycle: pending_start → active → ending → ended.
export type EmploymentStatus = 'pending_start' | 'active' | 'ending' | 'ended';
export type EmploymentSide = 'barista' | 'business';
export type EmploymentConfirmedBy = EmploymentSide | 'auto';

export type BaristaEndReason = 'quit' | 'found_other' | 'conditions_mismatch' | 'other';
export type BusinessEndReason =
  'dismissed' | 'no_show' | 'probation_failed' | 'position_closed' | 'other';
export type EmploymentEndReason = BaristaEndReason | BusinessEndReason;

export const BARISTA_END_REASONS: readonly BaristaEndReason[] = [
  'quit',
  'found_other',
  'conditions_mismatch',
  'other',
];
export const BUSINESS_END_REASONS: readonly BusinessEndReason[] = [
  'dismissed',
  'no_show',
  'probation_failed',
  'position_closed',
  'other',
];

// Placement-fee readiness only — no rule or provider yet.
export type EmploymentFeeStatus = 'none' | 'pending' | 'due' | 'paid' | 'waived';

export type EmploymentJobSummary = {
  id: JobId;
  title: string;
  jobType: JobType;
  status: JobStatus;
  shiftDetails?: ShiftDetails;
  compensation?: Compensation;
  businessName?: string;
  businessLogoUrl?: string;
  branchName?: string;
  metroStation?: string;
};

export type EmploymentBaristaSummary = {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  yearsOfExperience?: number;
};

export type Employment = {
  id: EmploymentId;
  applicationId: ApplicationId;
  jobId: JobId;
  baristaId: UserId;
  businessOwnerId: UserId;
  businessId: string;
  branchId: string;
  status: EmploymentStatus;
  startDate: string; // YYYY-MM-DD
  startedAt?: string;
  startConfirmedBy?: EmploymentConfirmedBy;
  endRequestedBy?: EmploymentSide;
  endRequestedAt?: string;
  endAutoConfirmAt?: string;
  endReason?: EmploymentEndReason;
  endComment?: string;
  endedAt?: string;
  endConfirmedBy?: EmploymentConfirmedBy;
  feeStatus: EmploymentFeeStatus;
  feeAmount?: number;
  feeDueAt?: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields (from database queries)
  job?: EmploymentJobSummary;
  baristaProfile?: EmploymentBaristaSummary;
};

export type RequestEmploymentEndData = {
  applicationId: ApplicationId;
  reason: EmploymentEndReason;
  comment?: string;
};
