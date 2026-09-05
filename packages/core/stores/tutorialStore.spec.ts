import type { TutorialFacts, TutorialProgress } from '../types/tutorial';
import type { User } from '../types/user';

const mockIsEnabled = jest.fn();
const mockGetProgress = jest.fn();
const mockSaveProgress = jest.fn();
const mockReset = jest.fn();
const mockGetFacts = jest.fn();

jest.mock('../services/TutorialService', () => ({
  TutorialService: {
    isEnabled: (...args: unknown[]) => mockIsEnabled(...args),
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
    saveProgress: (...args: unknown[]) => mockSaveProgress(...args),
    reset: (...args: unknown[]) => mockReset(...args),
    getFacts: (...args: unknown[]) => mockGetFacts(...args),
  },
}));

import { selectCurrentStep, useTutorialStore } from './tutorialStore';

const NOW = '2026-09-05T10:00:00.000Z';

const baristaUser = {
  id: 'user-1',
  uid: 'user-1',
  email: 'b@test.com',
  accountType: 'barista',
  isActive: true,
  isVerified: true,
  createdAt: NOW,
  updatedAt: NOW,
  suspendedUntil: null,
  bannedAt: null,
  banReason: null,
  consentAcceptedAt: NOW,
} as User;

const businessUser = {
  ...baristaUser,
  id: 'user-2',
  uid: 'user-2',
  accountType: 'business',
} as User;

const noFacts: TutorialFacts = {
  hasBaristaProfile: false,
  profileCompleteness: 0,
  hasApplication: false,
  hasBusiness: false,
  hasBranch: false,
  hasJob: false,
  hasOffer: false,
  hasConversation: false,
};

const completedProgress: TutorialProgress = {
  userId: baristaUser.id as TutorialProgress['userId'],
  accountType: 'barista',
  version: 1,
  steps: {},
  completedAt: NOW,
  skippedAllAt: null,
  replayHintShownAt: NOW,
};

// Progress writes are chained behind a promise; let the microtasks settle.
const flushWrites = (): Promise<void> => jest.advanceTimersByTimeAsync(0);

const savedSteps = (): Record<string, unknown> => {
  const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1];
  return (lastCall?.[2] as { steps?: Record<string, unknown> })?.steps ?? {};
};

const bootstrapFresh = async (user: User = baristaUser, facts: TutorialFacts = noFacts) => {
  mockIsEnabled.mockResolvedValue(true);
  mockGetProgress.mockResolvedValue(null);
  mockGetFacts.mockResolvedValue(facts);
  await useTutorialStore.getState().bootstrap(user);
};

beforeEach(() => {
  jest.useFakeTimers();
  mockIsEnabled.mockReset();
  mockGetProgress.mockReset();
  mockSaveProgress.mockReset();
  mockReset.mockReset();
  mockGetFacts.mockReset();
  mockSaveProgress.mockResolvedValue(undefined);
  useTutorialStore.getState().clear();
  useTutorialStore.setState({ holds: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('tutorialStore.bootstrap', () => {
  it('stays disabled when the feature flag is off', async () => {
    mockIsEnabled.mockResolvedValue(false);
    await useTutorialStore.getState().bootstrap(baristaUser);
    expect(useTutorialStore.getState().status).toBe('disabled');
    expect(mockGetProgress).not.toHaveBeenCalled();
  });

  it('starts a fresh tour at the welcome card without writing anything', async () => {
    await bootstrapFresh();
    const state = useTutorialStore.getState();
    expect([state.status, state.currentStepKey, state.accountType]).toEqual([
      'active',
      'welcome',
      'barista',
    ]);
    expect(mockSaveProgress).not.toHaveBeenCalled();
  });

  it('does nothing visible for a completed tour', async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockGetProgress.mockResolvedValue(completedProgress);
    mockGetFacts.mockResolvedValue(noFacts);
    await useTutorialStore.getState().bootstrap(baristaUser);
    const state = useTutorialStore.getState();
    expect([state.status, state.showReplayHint, state.currentStepKey]).toEqual([
      'completed',
      false,
      null,
    ]);
  });

  it('auto-completes fact-backed steps and persists them once', async () => {
    await bootstrapFresh(baristaUser, { ...noFacts, hasBaristaProfile: true });
    await flushWrites();
    expect(useTutorialStore.getState().currentStepKey).toBe('welcome');
    expect(mockSaveProgress).toHaveBeenCalledTimes(1);
    expect(Object.keys(savedSteps())).toEqual(['profile.open', 'profile.fill']);
  });

  it('disables itself when the backend is unreachable', async () => {
    mockIsEnabled.mockRejectedValue(new Error('offline'));
    await useTutorialStore.getState().bootstrap(baristaUser);
    expect(useTutorialStore.getState().status).toBe('disabled');
  });

  it('drops a bootstrap result that lands after clear()', async () => {
    let resolveFlag: (value: boolean) => void = () => undefined;
    mockIsEnabled.mockReturnValue(new Promise<boolean>(resolve => (resolveFlag = resolve)));
    const pending = useTutorialStore.getState().bootstrap(baristaUser);
    useTutorialStore.getState().clear();
    resolveFlag(true);
    await pending;
    expect(useTutorialStore.getState().status).toBe('idle');
  });
});

describe('tutorialStore step progression', () => {
  it('advances past the welcome card on completeStep and persists the record', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().completeStep('welcome');
    await flushWrites();
    expect(useTutorialStore.getState().currentStepKey).toBe('profile.open');
    expect(savedSteps()).toEqual({ welcome: { status: 'done', at: expect.any(String) } });
  });

  it('closes a route-bound step when the route arrives and schedules a facts refresh', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().completeStep('welcome');
    useTutorialStore.getState().setRoute('profileSetup');
    expect(useTutorialStore.getState().currentStepKey).toBe('profile.fill');

    mockGetFacts.mockResolvedValue({ ...noFacts, hasBaristaProfile: true });
    await jest.advanceTimersByTimeAsync(300);
    expect(mockGetFacts).toHaveBeenCalledTimes(2);
    expect(useTutorialStore.getState().currentStepKey).toBe('jobs.tab');
  });

  it('closes an anchor-bound step when the anchor becomes visible', async () => {
    await bootstrapFresh();
    const store = useTutorialStore.getState();
    store.completeStep('welcome');
    store.skipStep('profile.open');
    store.skipStep('profile.fill');
    store.setRoute('jobFeed');
    store.completeStep('jobs.filters');
    expect(useTutorialStore.getState().currentStepKey).toBe('jobs.open');

    useTutorialStore.getState().setVisibleAnchors(['job.apply']);
    expect(useTutorialStore.getState().currentStepKey).toBe('jobs.apply');
  });

  it('records a skipped step and moves on', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().completeStep('welcome');
    useTutorialStore.getState().skipStep('profile.open');
    await flushWrites();
    expect(useTutorialStore.getState().currentStepKey).toBe('profile.fill');
    expect(savedSteps()['profile.open']).toEqual({ status: 'skipped', at: expect.any(String) });
  });

  it('exposes the current step definition through selectCurrentStep', async () => {
    await bootstrapFresh(businessUser);
    expect(selectCurrentStep(useTutorialStore.getState())?.mode).toBe('card');
  });
});

describe('tutorialStore finishing', () => {
  it('skipAll completes the tour and shows the replay hint once', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().skipAll();
    await flushWrites();
    const state = useTutorialStore.getState();
    expect([state.status, state.showReplayHint, state.currentStepKey]).toEqual([
      'completed',
      true,
      null,
    ]);
    const patch = mockSaveProgress.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(patch.steps as object)).toHaveLength(12);
    expect(patch.skippedAllAt).toEqual(expect.any(String));
    expect(patch.completedAt).toEqual(expect.any(String));
  });

  it('does not show the replay hint again when it was already shown', async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockGetProgress.mockResolvedValue({ ...completedProgress, completedAt: null });
    mockGetFacts.mockResolvedValue(noFacts);
    await useTutorialStore.getState().bootstrap(baristaUser);
    useTutorialStore.getState().skipAll();
    expect(useTutorialStore.getState().showReplayHint).toBe(false);
  });

  it('dismissReplayHint stamps replayHintShownAt', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().skipAll();
    useTutorialStore.getState().dismissReplayHint();
    await flushWrites();
    expect(useTutorialStore.getState().showReplayHint).toBe(false);
    expect(mockSaveProgress).toHaveBeenLastCalledWith('user-1', 'barista', {
      replayHintShownAt: expect.any(String),
    });
  });

  it('restart resets on the server and starts again at welcome', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().skipAll();
    mockReset.mockResolvedValue({
      ...completedProgress,
      completedAt: null,
      replayHintShownAt: NOW,
    });
    await useTutorialStore.getState().restart();
    const state = useTutorialStore.getState();
    expect(mockReset).toHaveBeenCalledWith('user-1', 'barista');
    expect([state.status, state.currentStepKey, state.showReplayHint]).toEqual([
      'active',
      'welcome',
      false,
    ]);
  });
});

describe('tutorialStore holds and clear', () => {
  it('tracks hold reasons without duplicates', () => {
    const store = useTutorialStore.getState();
    store.hold('push');
    store.hold('push');
    store.hold('location');
    expect(useTutorialStore.getState().holds).toEqual(['push', 'location']);
    useTutorialStore.getState().release('push');
    expect(useTutorialStore.getState().holds).toEqual(['location']);
  });

  it('clear returns to idle and forgets the user', async () => {
    await bootstrapFresh();
    useTutorialStore.getState().clear();
    const state = useTutorialStore.getState();
    expect([state.status, state.userId, state.progress, state.currentStepKey]).toEqual([
      'idle',
      null,
      null,
      null,
    ]);
  });
});
