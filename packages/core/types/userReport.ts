import type { UserReportId } from './ids';

export type ReportReasonCode =
  'spam' | 'fraud' | 'harassment' | 'noshow' | 'offensive_photo' | 'other';

export type ReportTargetType = 'user' | 'job' | 'message' | 'review' | 'business' | 'branch';

export type ReportStatus = 'open' | 'triaged' | 'resolved' | 'dismissed';

export type ReportOutcome = 'no_violation' | 'warning' | 'suspension' | 'ban';

export type UserReport = {
  id: UserReportId;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  details: string | null;
  status: ReportStatus;
  outcome: ReportOutcome | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type SubmitReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  details?: string;
};
