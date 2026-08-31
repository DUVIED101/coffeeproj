import type {
  ApplicationStatus,
  ShiftConfirmationStatus,
  ShiftLifecycleStatus,
} from '../types/application';
import type { JobStatus, ShiftDetails, TemporaryShiftDetails } from '../types/job';
import { canBaristaCancelShift, classifyShiftLifecycle } from './shiftLifecycle';

const baseShift = (overrides: Partial<TemporaryShiftDetails> = {}): TemporaryShiftDetails => ({
  kind: 'temporary',
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

const confirmationApp = (
  confirmationStatus: ShiftConfirmationStatus | undefined,
  status: ApplicationStatus = 'accepted'
) => ({ status, shiftConfirmationStatus: confirmationStatus });

describe('canBaristaCancelShift', () => {
  const shift = baseShift();
  const beforeShift = new Date('2026-05-19T12:00:00Z');
  const longAfterShift = new Date('2026-05-20T20:00:00Z');

  it('returns false when application status is not accepted', () => {
    expect(
      canBaristaCancelShift(
        { status: 'pending', shiftConfirmationStatus: undefined },
        shift,
        beforeShift
      )
    ).toBe(false);
    expect(
      canBaristaCancelShift(
        { status: 'withdrawn', shiftConfirmationStatus: undefined },
        shift,
        beforeShift
      )
    ).toBe(false);
    expect(
      canBaristaCancelShift(
        { status: 'completed', shiftConfirmationStatus: undefined },
        shift,
        longAfterShift
      )
    ).toBe(false);
  });

  it('returns false when barista has confirmed the shift (cancel locked)', () => {
    expect(canBaristaCancelShift(confirmationApp('confirmed'), shift, beforeShift)).toBe(false);
  });

  it('returns true before the shift when confirmation is pending', () => {
    expect(canBaristaCancelShift(confirmationApp('pending'), shift, beforeShift)).toBe(true);
  });

  it('returns true before the shift when confirmation has not been requested yet', () => {
    expect(canBaristaCancelShift(confirmationApp(undefined), shift, beforeShift)).toBe(true);
  });

  it('returns true when confirmation was declined but cancel window is still open', () => {
    // Declined means barista already triggered a withdraw, but the helper still
    // reflects the window while the status is 'accepted'.
    expect(canBaristaCancelShift(confirmationApp('declined'), shift, beforeShift)).toBe(true);
  });

  it('returns false after shift ends regardless of confirmation status', () => {
    expect(canBaristaCancelShift(confirmationApp(undefined), shift, longAfterShift)).toBe(false);
    expect(canBaristaCancelShift(confirmationApp('pending'), shift, longAfterShift)).toBe(false);
  });

  it('handles cross-midnight shift: returns true before start, false after cancel window', () => {
    const nightShift = baseShift({
      startDate: '2026-05-20',
      startTime: '22:00',
      endTime: '06:00',
      endDate: undefined,
    });
    const beforeNightShift = new Date('2026-05-20T20:00:00Z');
    const afterWindow = new Date('2026-05-20T23:30:00Z');
    expect(canBaristaCancelShift(confirmationApp(undefined), nightShift, beforeNightShift)).toBe(
      true
    );
    expect(canBaristaCancelShift(confirmationApp(undefined), nightShift, afterWindow)).toBe(false);
  });
});
