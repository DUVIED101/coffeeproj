import type { Application, ApplicationStatus, ShiftLifecycleStatus } from '../types/application';
import type { Job, ShiftDetails } from '../types/job';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseTime = (time: string): { h: number; m: number } => {
  const [h, m] = time.split(':').map(part => parseInt(part, 10));
  return { h, m: m || 0 };
};

const dateAtTime = (isoDate: string, time: string): Date => {
  const [y, mo, d] = isoDate.split('-').map(part => parseInt(part, 10));
  const { h, m } = parseTime(time);
  return new Date(Date.UTC(y, mo - 1, d, h, m));
};

const shiftBoundary = (shift: ShiftDetails): { start: Date; end: Date } => {
  const start = dateAtTime(shift.startDate, shift.startTime);
  const endDateStr = shift.endDate ?? shift.startDate;
  let end = dateAtTime(endDateStr, shift.endTime);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + MS_PER_DAY);
  }
  return { start, end };
};

export const getShiftEnd = (shift: ShiftDetails): Date => shiftBoundary(shift).end;

export const getShiftStart = (shift: ShiftDetails): Date => shiftBoundary(shift).start;

const ONE_HOUR_MS = 60 * 60 * 1000;

// Cancel button is allowed before the shift and within the first hour after it
// begins. After that, the shift is considered "in progress" beyond rescue and
// the parties should use the no-show / completion flow instead.
export const canCancelShiftNow = (shift: ShiftDetails, now: Date = new Date()): boolean => {
  const start = getShiftStart(shift);
  return now.getTime() < start.getTime() + ONE_HOUR_MS;
};

const PENDING_STATUSES: ApplicationStatus[] = ['pending', 'under_review'];

export const classifyShiftLifecycle = (
  job: Pick<Job, 'status' | 'shiftDetails'>,
  applications: Pick<Application, 'status'>[],
  now: Date = new Date()
): ShiftLifecycleStatus => {
  if (applications.some(a => a.status === 'completed')) return 'completed';

  const hasAccepted = applications.some(a => a.status === 'accepted');
  if (hasAccepted) {
    const { start, end } = shiftBoundary(job.shiftDetails);
    if (now.getTime() < start.getTime()) return 'accepted';
    if (now.getTime() <= end.getTime()) return 'in_progress';
    return 'in_progress';
  }

  if (applications.some(a => PENDING_STATUSES.includes(a.status))) return 'under_review';

  return 'open';
};
