import type { UserId } from '../types/ids';
import type {
  TutorialAnchorKey,
  TutorialFacts,
  TutorialProgress,
  TutorialRole,
  TutorialRouteKey,
  TutorialStep,
  TutorialStepKey,
  TutorialStepStatus,
  TutorialStepsMap,
} from '../types/tutorial';
import { TUTORIAL_VERSION } from './steps';

export type TutorialStepContext = {
  facts: TutorialFacts | null;
  route: TutorialRouteKey | null;
  visibleAnchors: ReadonlySet<TutorialAnchorKey>;
};

export const freshProgress = (
  userId: UserId,
  accountType: TutorialRole,
  _now: string
): TutorialProgress => ({
  userId,
  accountType,
  version: TUTORIAL_VERSION,
  steps: {},
  completedAt: null,
  skippedAllAt: null,
  replayHintShownAt: null,
});

export const normalizeProgress = (
  row: TutorialProgress | null,
  userId: UserId,
  accountType: TutorialRole,
  now: string
): TutorialProgress => {
  if (!row) return freshProgress(userId, accountType, now);
  if (row.accountType === accountType) return row;
  return { ...freshProgress(userId, accountType, now), replayHintShownAt: row.replayHintShownAt };
};

export const applyAutoCompletion = (
  steps: readonly TutorialStep[],
  map: TutorialStepsMap,
  facts: TutorialFacts,
  now: string
): { steps: TutorialStepsMap; added: TutorialStepKey[] } => {
  const added: TutorialStepKey[] = [];
  const next: TutorialStepsMap = { ...map };
  for (const step of steps) {
    if (map[step.key] || !step.autoDoneWhen || !facts[step.autoDoneWhen.fact]) continue;
    next[step.key] = { status: 'done', at: now, auto: true };
    added.push(step.key);
  }
  return added.length === 0 ? { steps: map, added } : { steps: next, added };
};

export const resolveCurrentStep = (
  steps: readonly TutorialStep[],
  map: TutorialStepsMap
): TutorialStep | null => steps.find(step => !map[step.key]) ?? null;

export const isStepSatisfied = (step: TutorialStep, context: TutorialStepContext): boolean => {
  const condition = step.doneWhen;
  if (!condition) return false;
  if (condition.fact && context.facts?.[condition.fact]) return true;
  if (condition.route && context.route && condition.route.includes(context.route)) return true;
  if (condition.anchorVisible && context.visibleAnchors.has(condition.anchorVisible)) return true;
  return false;
};

export const markStep = (
  map: TutorialStepsMap,
  key: TutorialStepKey,
  status: TutorialStepStatus,
  now: string
): TutorialStepsMap => ({ ...map, [key]: { status, at: now } });

export const skipRemaining = (
  steps: readonly TutorialStep[],
  map: TutorialStepsMap,
  now: string
): TutorialStepsMap => {
  const next: TutorialStepsMap = { ...map };
  for (const step of steps) {
    if (!next[step.key]) next[step.key] = { status: 'skipped', at: now };
  }
  return next;
};

export const isCompleted = (progress: TutorialProgress): boolean =>
  progress.completedAt !== null || progress.skippedAllAt !== null;

export const stepPosition = (
  steps: readonly TutorialStep[],
  key: TutorialStepKey
): { n: number; total: number } => {
  const numbered = steps.filter(step => step.mode !== 'card');
  const index = numbered.findIndex(step => step.key === key);
  return { n: index + 1, total: numbered.length };
};
