import type { UserId } from '../types/ids';

const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockRpc = jest.fn();
const mockUpsert = jest.fn();
const mockFrom = jest.fn();

const selectChain = { eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })) };

jest.mock('../config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { TutorialService } from './TutorialService';
import { TUTORIAL_VERSION } from '../tutorial/steps';

const USER_ID = 'user-1' as UserId;
const NOW = '2026-09-05T10:00:00.000Z';

const storedRow = {
  user_id: 'user-1',
  account_type: 'barista',
  version: 1,
  steps: { welcome: { status: 'done', at: NOW } },
  completed_at: null,
  skipped_all_at: null,
  replay_hint_shown_at: NOW,
  created_at: NOW,
  updated_at: NOW,
};

const mappedRow = {
  userId: USER_ID,
  accountType: 'barista',
  version: 1,
  steps: { welcome: { status: 'done', at: NOW } },
  completedAt: null,
  skippedAllAt: null,
  replayHintShownAt: NOW,
};

beforeEach(() => {
  mockMaybeSingle.mockReset();
  mockSingle.mockReset();
  mockRpc.mockReset();
  mockUpsert.mockReset();
  mockFrom.mockReset();
  mockFrom.mockReturnValue({
    select: jest.fn(() => selectChain),
    upsert: mockUpsert,
  });
  mockUpsert.mockReturnValue({ select: jest.fn(() => ({ single: mockSingle })) });
});

describe('TutorialService.isEnabled', () => {
  it('treats a missing flag row as enabled', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(TutorialService.isEnabled()).resolves.toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('feature_flags');
  });

  it('honours an explicit enabled=false', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: { enabled: false } }, error: null });
    await expect(TutorialService.isEnabled()).resolves.toBe(false);
  });

  it('rethrows query errors', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(TutorialService.isEnabled()).rejects.toThrow('boom');
  });
});

describe('TutorialService.getProgress', () => {
  it('maps a stored row to camelCase', async () => {
    mockMaybeSingle.mockResolvedValue({ data: storedRow, error: null });
    await expect(TutorialService.getProgress(USER_ID)).resolves.toEqual(mappedRow);
    expect(mockFrom).toHaveBeenCalledWith('tutorial_progress');
  });

  it('returns null when the user has no row', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(TutorialService.getProgress(USER_ID)).resolves.toBeNull();
  });
});

describe('TutorialService.saveProgress', () => {
  it('upserts only the defined patch fields alongside the row identity', async () => {
    mockSingle.mockResolvedValue({ data: storedRow, error: null });

    const result = await TutorialService.saveProgress(USER_ID, 'barista', {
      steps: { welcome: { status: 'done', at: NOW } },
      completedAt: undefined,
      replayHintShownAt: NOW,
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        account_type: 'barista',
        version: TUTORIAL_VERSION,
        steps: { welcome: { status: 'done', at: NOW } },
        replay_hint_shown_at: NOW,
      },
      { onConflict: 'user_id' }
    );
    expect(result).toEqual(mappedRow);
  });
});

describe('TutorialService.reset', () => {
  it('clears steps and completion flags but leaves the replay hint alone', async () => {
    mockSingle.mockResolvedValue({ data: { ...storedRow, steps: {} }, error: null });

    await TutorialService.reset(USER_ID, 'business');

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        account_type: 'business',
        version: TUTORIAL_VERSION,
        steps: {},
        completed_at: null,
        skipped_all_at: null,
      },
      { onConflict: 'user_id' }
    );
  });
});

describe('TutorialService.getFacts', () => {
  it('maps the RPC payload and defaults missing fields', async () => {
    mockRpc.mockResolvedValue({
      data: { hasBusiness: true, hasBranch: 'yes', profileCompleteness: 40 },
      error: null,
    });

    await expect(TutorialService.getFacts()).resolves.toEqual({
      hasBaristaProfile: false,
      profileCompleteness: 40,
      hasApplication: false,
      hasBusiness: true,
      hasBranch: false,
      hasJob: false,
      hasOffer: false,
      hasConversation: false,
    });
    expect(mockRpc).toHaveBeenCalledWith('get_tutorial_facts');
  });
});
