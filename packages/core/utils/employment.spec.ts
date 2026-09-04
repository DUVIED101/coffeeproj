import type { Employment, EmploymentStatus } from '../types/employment';
import {
  canCancelEmploymentEndRequest,
  canConfirmEmploymentEnd,
  canConfirmEmploymentStart,
  canRequestEmploymentEnd,
  employmentSideOf,
  endReasonsForSide,
  isPermanentApplication,
  mapEmploymentRow,
  pickEmbeddedEmployment,
  type EmploymentRow,
} from './employment';

const BARISTA_ID = 'barista-1';
const OWNER_ID = 'owner-1';

const row = (overrides: Partial<EmploymentRow> = {}): EmploymentRow => ({
  id: 'emp-1',
  application_id: 'app-1',
  job_id: 'job-1',
  barista_id: BARISTA_ID,
  business_owner_id: OWNER_ID,
  business_id: 'biz-1',
  branch_id: 'branch-1',
  status: 'active',
  start_date: '2026-09-01',
  started_at: '2026-09-01T06:00:00Z',
  start_confirmed_by: 'business',
  end_requested_by: null,
  end_requested_at: null,
  end_auto_confirm_at: null,
  end_reason: null,
  end_comment: null,
  ended_at: null,
  end_confirmed_by: null,
  fee_status: 'none',
  fee_amount: null,
  fee_due_at: null,
  created_at: '2026-08-30T10:00:00Z',
  updated_at: '2026-09-01T06:00:00Z',
  ...overrides,
});

const employment = (status: EmploymentStatus, endRequestedBy?: 'barista' | 'business') =>
  ({ status, endRequestedBy }) as Pick<Employment, 'status' | 'endRequestedBy'>;

describe('mapEmploymentRow', () => {
  it('maps a full ended row to camelCase with numeric fee', () => {
    const mapped = mapEmploymentRow(
      row({
        status: 'ended',
        end_requested_by: 'barista',
        end_requested_at: '2026-10-01T09:00:00Z',
        end_auto_confirm_at: '2026-10-04T09:00:00Z',
        end_reason: 'quit',
        end_comment: 'спасибо',
        ended_at: '2026-10-02T09:00:00Z',
        end_confirmed_by: 'business',
        fee_status: 'waived',
        fee_amount: '1500.00',
      })
    );

    expect(mapped).toEqual({
      id: 'emp-1',
      applicationId: 'app-1',
      jobId: 'job-1',
      baristaId: BARISTA_ID,
      businessOwnerId: OWNER_ID,
      businessId: 'biz-1',
      branchId: 'branch-1',
      status: 'ended',
      startDate: '2026-09-01',
      startedAt: '2026-09-01T06:00:00Z',
      startConfirmedBy: 'business',
      endRequestedBy: 'barista',
      endRequestedAt: '2026-10-01T09:00:00Z',
      endAutoConfirmAt: '2026-10-04T09:00:00Z',
      endReason: 'quit',
      endComment: 'спасибо',
      endedAt: '2026-10-02T09:00:00Z',
      endConfirmedBy: 'business',
      feeStatus: 'waived',
      feeAmount: 1500,
      feeDueAt: undefined,
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-09-01T06:00:00Z',
    });
  });

  it('turns null optional columns into undefined', () => {
    const mapped = mapEmploymentRow(
      row({
        status: 'pending_start',
        started_at: null,
        start_confirmed_by: null,
      })
    );
    expect(mapped.startedAt).toBeUndefined();
    expect(mapped.startConfirmedBy).toBeUndefined();
    expect(mapped.feeAmount).toBeUndefined();
  });
});

describe('pickEmbeddedEmployment', () => {
  it('accepts a single object', () => {
    expect(pickEmbeddedEmployment(row())?.id).toBe('emp-1');
  });

  it('accepts a one-element array', () => {
    expect(pickEmbeddedEmployment([row()])?.id).toBe('emp-1');
  });

  it('returns undefined for null, undefined and empty arrays', () => {
    expect(pickEmbeddedEmployment(null)).toBeUndefined();
    expect(pickEmbeddedEmployment(undefined)).toBeUndefined();
    expect(pickEmbeddedEmployment([])).toBeUndefined();
  });
});

describe('isPermanentApplication', () => {
  it('is true when the job type is permanent', () => {
    expect(isPermanentApplication({ job: { jobType: 'permanent' } as never })).toBe(true);
  });

  it('is true when an employment is attached even without a job', () => {
    expect(isPermanentApplication({ employment: mapEmploymentRow(row()) })).toBe(true);
  });

  it('is false for a temporary job', () => {
    expect(
      isPermanentApplication({
        job: {
          jobType: 'temporary',
          shiftDetails: { kind: 'temporary' },
        } as never,
      })
    ).toBe(false);
  });
});

describe('employmentSideOf', () => {
  const emp = mapEmploymentRow(row());

  it('identifies barista, business and strangers', () => {
    expect(employmentSideOf(emp, BARISTA_ID)).toBe('barista');
    expect(employmentSideOf(emp, OWNER_ID)).toBe('business');
    expect(employmentSideOf(emp, 'someone-else')).toBeNull();
  });
});

describe('endReasonsForSide', () => {
  it('gives each side its own reason list', () => {
    expect(endReasonsForSide('barista')).toEqual([
      'quit',
      'found_other',
      'conditions_mismatch',
      'other',
    ]);
    expect(endReasonsForSide('business')).toEqual([
      'dismissed',
      'no_show',
      'probation_failed',
      'position_closed',
      'other',
    ]);
  });
});

describe('employment stage guards', () => {
  it('canConfirmEmploymentStart only in pending_start', () => {
    expect(canConfirmEmploymentStart(employment('pending_start'))).toBe(true);
    expect(canConfirmEmploymentStart(employment('active'))).toBe(false);
    expect(canConfirmEmploymentStart(employment('ending'))).toBe(false);
    expect(canConfirmEmploymentStart(employment('ended'))).toBe(false);
  });

  it('canRequestEmploymentEnd in pending_start and active only', () => {
    expect(canRequestEmploymentEnd(employment('pending_start'))).toBe(true);
    expect(canRequestEmploymentEnd(employment('active'))).toBe(true);
    expect(canRequestEmploymentEnd(employment('ending'))).toBe(false);
    expect(canRequestEmploymentEnd(employment('ended'))).toBe(false);
  });

  it('canConfirmEmploymentEnd only for the counterpart of the requester', () => {
    expect(canConfirmEmploymentEnd(employment('ending', 'barista'), 'business')).toBe(true);
    expect(canConfirmEmploymentEnd(employment('ending', 'barista'), 'barista')).toBe(false);
    expect(canConfirmEmploymentEnd(employment('active', 'barista'), 'business')).toBe(false);
  });

  it('canCancelEmploymentEndRequest only for the requester', () => {
    expect(canCancelEmploymentEndRequest(employment('ending', 'business'), 'business')).toBe(true);
    expect(canCancelEmploymentEndRequest(employment('ending', 'business'), 'barista')).toBe(false);
    expect(canCancelEmploymentEndRequest(employment('ended', 'business'), 'business')).toBe(false);
  });
});
