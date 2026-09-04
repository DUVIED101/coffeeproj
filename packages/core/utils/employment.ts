import type { Application } from '../types/application';
import type {
  Employment,
  EmploymentEndReason,
  EmploymentSide,
  EmploymentStatus,
} from '../types/employment';
import { BARISTA_END_REASONS, BUSINESS_END_REASONS } from '../types/employment';
import type { ApplicationId, EmploymentId, JobId, UserId } from '../types/ids';
import type { ShiftDetails } from '../types/job';

export const isPermanentShift = (shift?: ShiftDetails | null): boolean =>
  shift?.kind === 'permanent';

export const isPermanentApplication = (
  application: Pick<Application, 'job' | 'employment'>
): boolean =>
  application.employment !== undefined ||
  application.job?.jobType === 'permanent' ||
  isPermanentShift(application.job?.shiftDetails);

export const endReasonsForSide = (side: EmploymentSide): readonly EmploymentEndReason[] =>
  side === 'barista' ? BARISTA_END_REASONS : BUSINESS_END_REASONS;

export const endReasonLabelKey = (reason: EmploymentEndReason): string =>
  `employment.endReason.${reason}`;

export const employmentSideOf = (
  employment: Pick<Employment, 'baristaId' | 'businessOwnerId'>,
  userId: string
): EmploymentSide | null =>
  userId === employment.baristaId
    ? 'barista'
    : userId === employment.businessOwnerId
      ? 'business'
      : null;

export const canConfirmEmploymentStart = (employment: Pick<Employment, 'status'>): boolean =>
  employment.status === 'pending_start';

export const canRequestEmploymentEnd = (employment: Pick<Employment, 'status'>): boolean =>
  employment.status === 'pending_start' || employment.status === 'active';

export const canConfirmEmploymentEnd = (
  employment: Pick<Employment, 'status' | 'endRequestedBy'>,
  viewerSide: EmploymentSide
): boolean => employment.status === 'ending' && employment.endRequestedBy !== viewerSide;

export const canCancelEmploymentEndRequest = (
  employment: Pick<Employment, 'status' | 'endRequestedBy'>,
  viewerSide: EmploymentSide
): boolean => employment.status === 'ending' && employment.endRequestedBy === viewerSide;

export const isEmploymentOpen = (employment: Pick<Employment, 'status'>): boolean =>
  employment.status !== 'ended';

export type EmploymentRow = {
  id: string;
  application_id: string;
  job_id: string;
  barista_id: string;
  business_owner_id: string;
  business_id: string;
  branch_id: string;
  status: EmploymentStatus;
  start_date: string;
  started_at: string | null;
  start_confirmed_by: Employment['startConfirmedBy'] | null;
  end_requested_by: EmploymentSide | null;
  end_requested_at: string | null;
  end_auto_confirm_at: string | null;
  end_reason: EmploymentEndReason | null;
  end_comment: string | null;
  ended_at: string | null;
  end_confirmed_by: Employment['endConfirmedBy'] | null;
  fee_status: Employment['feeStatus'];
  fee_amount: number | string | null;
  fee_due_at: string | null;
  created_at: string;
  updated_at: string;
};

export const mapEmploymentRow = (row: EmploymentRow): Employment => ({
  id: row.id as EmploymentId,
  applicationId: row.application_id as ApplicationId,
  jobId: row.job_id as JobId,
  baristaId: row.barista_id as UserId,
  businessOwnerId: row.business_owner_id as UserId,
  businessId: row.business_id,
  branchId: row.branch_id,
  status: row.status,
  startDate: row.start_date,
  startedAt: row.started_at ?? undefined,
  startConfirmedBy: row.start_confirmed_by ?? undefined,
  endRequestedBy: row.end_requested_by ?? undefined,
  endRequestedAt: row.end_requested_at ?? undefined,
  endAutoConfirmAt: row.end_auto_confirm_at ?? undefined,
  endReason: row.end_reason ?? undefined,
  endComment: row.end_comment ?? undefined,
  endedAt: row.ended_at ?? undefined,
  endConfirmedBy: row.end_confirmed_by ?? undefined,
  feeStatus: row.fee_status ?? 'none',
  feeAmount:
    row.fee_amount === null || row.fee_amount === undefined ? undefined : Number(row.fee_amount),
  feeDueAt: row.fee_due_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// PostgREST returns a 1:0..1 embed either as an object or a one-element array
// depending on how it resolved the relationship; normalise both shapes.
export const pickEmbeddedEmployment = (value: unknown): Employment | undefined => {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return undefined;
  return mapEmploymentRow(row as EmploymentRow);
};
