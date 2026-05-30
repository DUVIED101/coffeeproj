import type { JobId, JobOfferId, UserId } from '../types/ids';

const mockCheckApplicationExists = jest.fn();
const mockInsertSingle = jest.fn();
const mockRpc = jest.fn();
const mockSelectMaybeSingle = jest.fn();

const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockInsertSingle });
const mockInsertBuilder = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });

const mockMaybeSingleStep = jest.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
const mockEqStep = jest.fn().mockReturnValue({ maybeSingle: mockSelectMaybeSingle });
const mockSelectStep = jest
  .fn()
  .mockReturnValue({ eq: mockEqStep, maybeSingle: mockMaybeSingleStep });

jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockInsertBuilder,
      select: mockSelectStep,
    })),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('./ApplicationService', () => ({
  ApplicationService: {
    checkApplicationExists: (...args: unknown[]) => mockCheckApplicationExists(...args),
  },
}));

import {
  JobOfferAlreadyAppliedError,
  JobOfferDuplicatePendingError,
  JobOfferJobUnavailableError,
  JobOfferService,
  JobOfferTerminalError,
} from './JobOfferService';

const OFFER_ID = 'offer-uuid-1' as JobOfferId;
const APPLICATION_ID = 'application-uuid-1';
const BUSINESS_OWNER_ID = 'business-uuid-1' as UserId;
const BARISTA_ID = 'barista-uuid-1' as UserId;
const JOB_ID = 'job-uuid-1' as JobId;

beforeEach(() => {
  mockCheckApplicationExists.mockReset();
  mockInsertSingle.mockReset();
  mockRpc.mockReset();
  mockSelectMaybeSingle.mockReset();
});

describe('JobOfferService.createOffer', () => {
  it('throws JobOfferAlreadyAppliedError when an application for the same (job, barista) already exists', async () => {
    mockCheckApplicationExists.mockResolvedValue({ id: 'app-1' });

    await expect(
      JobOfferService.createOffer({
        businessOwnerId: BUSINESS_OWNER_ID,
        baristaId: BARISTA_ID,
        jobId: JOB_ID,
      })
    ).rejects.toBeInstanceOf(JobOfferAlreadyAppliedError);

    expect(mockInsertSingle).not.toHaveBeenCalled();
  });

  it('throws JobOfferDuplicatePendingError when the partial unique index trips (23505)', async () => {
    mockCheckApplicationExists.mockResolvedValue(null);
    mockInsertSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } });

    await expect(
      JobOfferService.createOffer({
        businessOwnerId: BUSINESS_OWNER_ID,
        baristaId: BARISTA_ID,
        jobId: JOB_ID,
      })
    ).rejects.toBeInstanceOf(JobOfferDuplicatePendingError);
  });
});

describe('JobOfferService.respondToOffer', () => {
  it('returns the new applicationId on accepted', async () => {
    mockRpc.mockResolvedValue({ data: APPLICATION_ID, error: null });

    const result = await JobOfferService.respondToOffer(OFFER_ID, 'accepted');

    expect(mockRpc).toHaveBeenCalledWith('respond_to_job_offer', {
      p_offer_id: OFFER_ID,
      p_response: 'accepted',
    });
    expect(result).toEqual({ status: 'accepted', applicationId: APPLICATION_ID });
  });

  it('returns { status: declined } on declined', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await JobOfferService.respondToOffer(OFFER_ID, 'declined');

    expect(result).toEqual({ status: 'declined' });
  });

  it('maps JOB_UNAVAILABLE rpc error to JobOfferJobUnavailableError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'JOB_UNAVAILABLE' } });

    await expect(JobOfferService.respondToOffer(OFFER_ID, 'accepted')).rejects.toBeInstanceOf(
      JobOfferJobUnavailableError
    );
  });

  it('maps OFFER_TERMINAL rpc error to JobOfferTerminalError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'OFFER_TERMINAL' } });

    await expect(JobOfferService.respondToOffer(OFFER_ID, 'accepted')).rejects.toBeInstanceOf(
      JobOfferTerminalError
    );
  });
});

describe('JobOfferService.cancelOffer', () => {
  it('invokes the cancel_job_offer rpc with the offer id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await JobOfferService.cancelOffer(OFFER_ID);

    expect(mockRpc).toHaveBeenCalledWith('cancel_job_offer', { p_offer_id: OFFER_ID });
  });
});
