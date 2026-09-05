import type { UserId } from '../types/ids';
import type {
  TutorialFacts,
  TutorialProgress,
  TutorialStep,
  TutorialStepsMap,
} from '../types/tutorial';
import {
  applyAutoCompletion,
  freshProgress,
  isCompleted,
  isStepSatisfied,
  markStep,
  normalizeProgress,
  resolveCurrentStep,
  skipRemaining,
  stepPosition,
} from './engine';
import { BARISTA_STEPS, BUSINESS_STEPS, TUTORIAL_VERSION } from './steps';

const USER_ID = 'user-1' as UserId;
const NOW = '2026-09-05T10:00:00.000Z';
const LATER = '2026-09-05T10:05:00.000Z';

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

const stepByKey = (steps: readonly TutorialStep[], key: TutorialStep['key']): TutorialStep => {
  const step = steps.find(s => s.key === key);
  if (!step) throw new Error(`missing step ${key}`);
  return step;
};

const emptyContext = { facts: noFacts, route: null, visibleAnchors: new Set<never>() };

describe('freshProgress', () => {
  it('returns an empty progress row for the user and role', () => {
    expect(freshProgress(USER_ID, 'barista', NOW)).toEqual({
      userId: USER_ID,
      accountType: 'barista',
      version: TUTORIAL_VERSION,
      steps: {},
      completedAt: null,
      skippedAllAt: null,
      replayHintShownAt: null,
    });
  });
});

describe('normalizeProgress', () => {
  it('returns fresh progress when there is no stored row', () => {
    expect(normalizeProgress(null, USER_ID, 'business', NOW)).toEqual(
      freshProgress(USER_ID, 'business', NOW)
    );
  });

  it('keeps a stored row of the same role untouched', () => {
    const stored: TutorialProgress = {
      ...freshProgress(USER_ID, 'barista', NOW),
      steps: { welcome: { status: 'done', at: NOW } },
      completedAt: LATER,
    };
    expect(normalizeProgress(stored, USER_ID, 'barista', LATER)).toBe(stored);
  });

  it('starts over when the stored role differs but remembers the replay hint', () => {
    const stored: TutorialProgress = {
      ...freshProgress(USER_ID, 'barista', NOW),
      steps: { welcome: { status: 'done', at: NOW } },
      completedAt: NOW,
      replayHintShownAt: NOW,
    };
    expect(normalizeProgress(stored, USER_ID, 'business', LATER)).toEqual({
      ...freshProgress(USER_ID, 'business', LATER),
      replayHintShownAt: NOW,
    });
  });
});

describe('applyAutoCompletion', () => {
  it('marks unrecorded fact-backed steps as auto-done and reports them', () => {
    const facts = { ...noFacts, hasBaristaProfile: true };
    expect(applyAutoCompletion(BARISTA_STEPS, {}, facts, NOW)).toEqual({
      steps: {
        'profile.open': { status: 'done', at: NOW, auto: true },
        'profile.fill': { status: 'done', at: NOW, auto: true },
      },
      added: ['profile.open', 'profile.fill'],
    });
  });

  it('leaves recorded steps and unsatisfied facts alone', () => {
    const map: TutorialStepsMap = { 'profile.open': { status: 'skipped', at: NOW } };
    const facts = { ...noFacts, hasBaristaProfile: true };
    expect(applyAutoCompletion(BARISTA_STEPS, map, facts, LATER)).toEqual({
      steps: { ...map, 'profile.fill': { status: 'done', at: LATER, auto: true } },
      added: ['profile.fill'],
    });
  });

  it('returns the same map instance when nothing changes', () => {
    const map: TutorialStepsMap = {};
    expect(applyAutoCompletion(BARISTA_STEPS, map, noFacts, NOW).steps).toBe(map);
  });
});

describe('resolveCurrentStep', () => {
  it('returns the first step without a record', () => {
    const map: TutorialStepsMap = {
      welcome: { status: 'done', at: NOW },
      'profile.open': { status: 'skipped', at: NOW },
    };
    expect(resolveCurrentStep(BARISTA_STEPS, map)?.key).toBe('profile.fill');
  });

  it('returns null when every step is recorded', () => {
    const map = skipRemaining(BUSINESS_STEPS, {}, NOW);
    expect(resolveCurrentStep(BUSINESS_STEPS, map)).toBeNull();
  });
});

describe('isStepSatisfied', () => {
  it('is false for a step without conditions', () => {
    expect(isStepSatisfied(stepByKey(BARISTA_STEPS, 'welcome'), emptyContext)).toBe(false);
  });

  it('closes on a matching route', () => {
    const step = stepByKey(BARISTA_STEPS, 'jobs.tab');
    expect(isStepSatisfied(step, { ...emptyContext, route: 'jobFeed' })).toBe(true);
    expect(isStepSatisfied(step, { ...emptyContext, route: 'profile' })).toBe(false);
  });

  it('closes on a visible anchor', () => {
    const step = stepByKey(BARISTA_STEPS, 'jobs.open');
    expect(
      isStepSatisfied(step, { ...emptyContext, visibleAnchors: new Set(['job.apply' as const]) })
    ).toBe(true);
  });

  it('closes on a true fact and ignores missing facts', () => {
    const step = stepByKey(BUSINESS_STEPS, 'job.create.fill');
    expect(isStepSatisfied(step, { ...emptyContext, facts: { ...noFacts, hasJob: true } })).toBe(
      true
    );
    expect(isStepSatisfied(step, { ...emptyContext, facts: null })).toBe(false);
  });
});

describe('markStep', () => {
  it('records the status without mutating the input map', () => {
    const map: TutorialStepsMap = {};
    const next = markStep(map, 'welcome', 'done', NOW);
    expect(next).toEqual({ welcome: { status: 'done', at: NOW } });
    expect(map).toEqual({});
  });
});

describe('skipRemaining', () => {
  it('marks every unrecorded step skipped and keeps existing records', () => {
    const map: TutorialStepsMap = { welcome: { status: 'done', at: NOW } };
    const next = skipRemaining(BARISTA_STEPS, map, LATER);
    expect(next.welcome).toEqual({ status: 'done', at: NOW });
    expect(Object.keys(next)).toHaveLength(BARISTA_STEPS.length);
    expect(next['settings.gear']).toEqual({ status: 'skipped', at: LATER });
  });
});

describe('isCompleted', () => {
  it('is true only once completedAt or skippedAllAt is set', () => {
    const fresh = freshProgress(USER_ID, 'barista', NOW);
    expect(isCompleted(fresh)).toBe(false);
    expect(isCompleted({ ...fresh, completedAt: NOW })).toBe(true);
    expect(isCompleted({ ...fresh, skippedAllAt: NOW })).toBe(true);
  });
});

describe('stepPosition', () => {
  it('numbers non-card steps from one and excludes cards from the total', () => {
    expect(stepPosition(BARISTA_STEPS, 'profile.open')).toEqual({ n: 1, total: 11 });
    expect(stepPosition(BARISTA_STEPS, 'settings.gear')).toEqual({ n: 11, total: 11 });
    expect(stepPosition(BUSINESS_STEPS, 'settings.gear')).toEqual({ n: 16, total: 16 });
  });

  it('gives cards position zero', () => {
    expect(stepPosition(BARISTA_STEPS, 'welcome')).toEqual({ n: 0, total: 11 });
  });
});
