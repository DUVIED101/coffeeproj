import type { ApplicationStatus, ShiftLifecycleStatus } from '../types/application';
import type { JobStatus, ShiftDetails } from '../types/job';
import { classifyShiftLifecycle } from './shiftLifecycle';

const baseShift = (overrides: Partial<ShiftDetails> = {}): ShiftDetails => ({
  startDate: '2026-05-20',
  endDate: '2026-05-20',
  startTime: '09:00',
  endTime: '17:00',
  isRecurring: false,
  recurringDays: undefined,
  ...overrides,
});

const job = (status: JobStatus, shift: ShiftDetails = baseShift()) => ({
  status,
  shiftDetails: shift,
});

const apps = (statuses: ApplicationStatus[]) => statuses.map(status => ({ status }));

describe('classifyShiftLifecycle', () => {
  const beforeShift = new Date('2026-05-19T12:00:00Z');
  const duringShift = new Date('2026-05-20T12:00:00Z');
  const afterShift = new Date('2026-05-21T12:00:00Z');

  it('returns "open" when job is open with no applications', () => {
    expect(classifyShiftLifecycle(job('open'), [], beforeShift)).toBe<ShiftLifecycleStatus>('open');
  });

  it('returns "open" when all applications are rejected or withdrawn', () => {
    expect(classifyShiftLifecycle(job('open'), apps(['rejected', 'withdrawn']), beforeShift)).toBe(
      'open'
    );
  });

  it('returns "under_review" when there is a pending application', () => {
    expect(classifyShiftLifecycle(job('open'), apps(['pending', 'rejected']), beforeShift)).toBe(
      'under_review'
    );
  });

  it('returns "under_review" when there is an under_review application', () => {
    expect(classifyShiftLifecycle(job('open'), apps(['under_review']), beforeShift)).toBe(
      'under_review'
    );
  });

  it('returns "accepted" when application is accepted and now is before the shift starts', () => {
    expect(classifyShiftLifecycle(job('filled'), apps(['accepted']), beforeShift)).toBe('accepted');
  });

  it('returns "in_progress" when shift is currently happening', () => {
    expect(classifyShiftLifecycle(job('filled'), apps(['accepted']), duringShift)).toBe(
      'in_progress'
    );
  });

  it('returns "in_progress" when accepted application is past shift end but not marked completed', () => {
    expect(classifyShiftLifecycle(job('filled'), apps(['accepted']), afterShift)).toBe(
      'in_progress'
    );
  });

  it('returns "completed" when any application is completed', () => {
    expect(classifyShiftLifecycle(job('filled'), apps(['completed']), afterShift)).toBe(
      'completed'
    );
  });

  it('treats the exact shift start instant as "in_progress" (inclusive lower bound)', () => {
    const shiftStartInstant = new Date('2026-05-20T09:00:00Z');
    expect(classifyShiftLifecycle(job('filled'), apps(['accepted']), shiftStartInstant)).toBe(
      'in_progress'
    );
  });

  it('handles a cross-midnight shift (endTime <= startTime, same startDate)', () => {
    // 2026-05-20 22:00 → 2026-05-21 06:00.
    const shift = baseShift({ startTime: '22:00', endTime: '06:00', endDate: undefined });
    const midShift = new Date('2026-05-21T02:00:00Z');

    expect(classifyShiftLifecycle(job('filled', shift), apps(['accepted']), midShift)).toBe(
      'in_progress'
    );
  });

  it('prefers "completed" over "in_progress" even when shift dates would suggest otherwise', () => {
    // Two apps: one completed, one accepted (e.g. a re-hire) — completed wins.
    expect(
      classifyShiftLifecycle(job('filled'), apps(['accepted', 'completed']), duringShift)
    ).toBe('completed');
  });
});
