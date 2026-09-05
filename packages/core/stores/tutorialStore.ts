import { create } from 'zustand';
import { TutorialService } from '../services/TutorialService';
import {
  applyAutoCompletion,
  isCompleted,
  isStepSatisfied,
  markStep,
  normalizeProgress,
  resolveCurrentStep,
  skipRemaining,
} from '../tutorial/engine';
import { stepsForRole } from '../tutorial/steps';
import type { UserId } from '../types/ids';
import type {
  TutorialAnchorKey,
  TutorialProgress,
  TutorialProgressPatch,
  TutorialRole,
  TutorialRouteKey,
  TutorialStep,
  TutorialStepKey,
  TutorialStepStatus,
  TutorialStepsMap,
} from '../types/tutorial';
import type { User } from '../types/user';

export type TutorialStatus = 'idle' | 'loading' | 'active' | 'completed' | 'disabled';

export type TutorialState = {
  status: TutorialStatus;
  userId: UserId | null;
  accountType: TutorialRole | null;
  steps: readonly TutorialStep[];
  progress: TutorialProgress | null;
  facts: TutorialProgressFacts;
  route: TutorialRouteKey | null;
  visibleAnchors: readonly TutorialAnchorKey[];
  currentStepKey: TutorialStepKey | null;
  showReplayHint: boolean;
  holds: readonly string[];
  bootstrap: (user: User) => Promise<void>;
  setRoute: (route: TutorialRouteKey | null) => void;
  setVisibleAnchors: (keys: readonly TutorialAnchorKey[]) => void;
  refreshFacts: () => Promise<void>;
  completeStep: (key: TutorialStepKey) => void;
  skipStep: (key: TutorialStepKey) => void;
  skipAll: () => void;
  dismissReplayHint: () => void;
  restart: () => Promise<void>;
  hold: (reason: string) => void;
  release: (reason: string) => void;
  clear: () => void;
};

type TutorialProgressFacts = Awaited<ReturnType<typeof TutorialService.getFacts>> | null;

const FACTS_DEBOUNCE_MS = 300;

const nowIso = (): string => new Date().toISOString();

const sameKeys = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every(key => b.includes(key));

// Async results from a superseded bootstrap/restart/clear are dropped by
// comparing against this counter.
let session = 0;
let writeChain: Promise<unknown> = Promise.resolve();
let factsTimer: ReturnType<typeof setTimeout> | null = null;

const initialState = {
  status: 'idle' as TutorialStatus,
  userId: null,
  accountType: null,
  steps: [] as readonly TutorialStep[],
  progress: null,
  facts: null,
  route: null,
  visibleAnchors: [] as readonly TutorialAnchorKey[],
  currentStepKey: null,
  showReplayHint: false,
  holds: [] as readonly string[],
};

export const useTutorialStore = create<TutorialState>((set, get) => {
  const persist = (patch: TutorialProgressPatch): void => {
    const { userId, accountType } = get();
    if (!userId || !accountType) return;
    writeChain = writeChain
      .then(() => TutorialService.saveProgress(userId, accountType, patch))
      .catch(error => console.warn('tutorial progress save failed', error));
  };

  const finish = (steps: TutorialStepsMap, skippedAllAt: string | null): void => {
    const { progress } = get();
    if (!progress) return;
    const next: TutorialProgress = {
      ...progress,
      steps,
      completedAt: progress.completedAt ?? nowIso(),
      skippedAllAt: skippedAllAt ?? progress.skippedAllAt,
    };
    set({
      progress: next,
      status: 'completed',
      currentStepKey: null,
      showReplayHint: next.replayHintShownAt === null,
    });
    persist({ steps, completedAt: next.completedAt, skippedAllAt: next.skippedAllAt });
  };

  const advance = (): void => {
    const state = get();
    if (state.status !== 'active' || !state.progress) return;
    const context = {
      facts: state.facts,
      route: state.route,
      visibleAnchors: new Set(state.visibleAnchors),
    };
    let map = state.progress.steps;
    let changed = false;
    for (;;) {
      const step = resolveCurrentStep(state.steps, map);
      if (!step) {
        finish(map, null);
        return;
      }
      if (!isStepSatisfied(step, context)) {
        if (changed) {
          set({ progress: { ...state.progress, steps: map }, currentStepKey: step.key });
          persist({ steps: map });
        } else if (state.currentStepKey !== step.key) {
          set({ currentStepKey: step.key });
        }
        return;
      }
      map = markStep(map, step.key, 'done', nowIso());
      changed = true;
    }
  };

  const record = (key: TutorialStepKey, status: TutorialStepStatus): void => {
    const state = get();
    if (state.status !== 'active' || !state.progress || state.progress.steps[key]) return;
    const steps = markStep(state.progress.steps, key, status, nowIso());
    set({ progress: { ...state.progress, steps } });
    persist({ steps });
    advance();
  };

  const scheduleFactsRefresh = (): void => {
    if (factsTimer) clearTimeout(factsTimer);
    factsTimer = setTimeout(() => {
      factsTimer = null;
      void get().refreshFacts();
    }, FACTS_DEBOUNCE_MS);
  };

  const activate = (
    progress: TutorialProgress,
    facts: NonNullable<TutorialProgressFacts>
  ): void => {
    const auto = applyAutoCompletion(get().steps, progress.steps, facts, nowIso());
    set({
      status: 'active',
      progress: auto.added.length ? { ...progress, steps: auto.steps } : progress,
      facts,
      currentStepKey: null,
      showReplayHint: false,
    });
    if (auto.added.length) persist({ steps: auto.steps });
    advance();
  };

  return {
    ...initialState,

    bootstrap: async user => {
      const userId = user.id as UserId;
      const accountType = user.accountType;
      if (!accountType) return;
      if (get().userId === userId && get().status !== 'idle') return;
      const token = ++session;
      const { holds, route, visibleAnchors } = get();
      set({
        ...initialState,
        status: 'loading',
        userId,
        accountType,
        steps: stepsForRole(accountType),
        holds,
        route,
        visibleAnchors,
      });
      try {
        const enabled = await TutorialService.isEnabled();
        if (token !== session) return;
        if (!enabled) {
          set({ status: 'disabled' });
          return;
        }
        const [row, facts] = await Promise.all([
          TutorialService.getProgress(userId),
          TutorialService.getFacts(),
        ]);
        if (token !== session) return;
        const progress = normalizeProgress(row, userId, accountType, nowIso());
        if (isCompleted(progress)) {
          set({ status: 'completed', progress, facts });
          return;
        }
        activate(progress, facts);
      } catch (error) {
        if (token !== session) return;
        console.warn('tutorial bootstrap failed', error);
        set({ status: 'disabled' });
      }
    },

    setRoute: route => {
      if (get().route === route) return;
      set({ route });
      if (get().status !== 'active') return;
      advance();
      scheduleFactsRefresh();
    },

    setVisibleAnchors: keys => {
      if (sameKeys(get().visibleAnchors, keys)) return;
      set({ visibleAnchors: [...keys] });
      if (get().status === 'active') advance();
    },

    refreshFacts: async () => {
      const token = session;
      if (get().status !== 'active') return;
      try {
        const facts = await TutorialService.getFacts();
        if (token !== session) return;
        const state = get();
        if (state.status !== 'active' || !state.progress) return;
        const auto = applyAutoCompletion(state.steps, state.progress.steps, facts, nowIso());
        set({
          facts,
          progress: auto.added.length ? { ...state.progress, steps: auto.steps } : state.progress,
        });
        if (auto.added.length) persist({ steps: auto.steps });
        advance();
      } catch (error) {
        console.warn('tutorial facts refresh failed', error);
      }
    },

    completeStep: key => record(key, 'done'),

    skipStep: key => record(key, 'skipped'),

    skipAll: () => {
      const state = get();
      if (state.status !== 'active' || !state.progress) return;
      const now = nowIso();
      finish(skipRemaining(state.steps, state.progress.steps, now), now);
    },

    dismissReplayHint: () => {
      const state = get();
      if (!state.showReplayHint || !state.progress) return;
      const replayHintShownAt = nowIso();
      set({ showReplayHint: false, progress: { ...state.progress, replayHintShownAt } });
      persist({ replayHintShownAt });
    },

    restart: async () => {
      const { userId, accountType } = get();
      if (!userId || !accountType) return;
      const token = ++session;
      set({ status: 'loading', currentStepKey: null, showReplayHint: false });
      try {
        await writeChain;
        const enabled = await TutorialService.isEnabled();
        if (token !== session) return;
        if (!enabled) {
          set({ status: 'disabled' });
          return;
        }
        const [progress, facts] = await Promise.all([
          TutorialService.reset(userId, accountType),
          TutorialService.getFacts(),
        ]);
        if (token !== session) return;
        activate(progress, facts);
      } catch (error) {
        if (token !== session) return;
        console.warn('tutorial restart failed', error);
        set({ status: 'disabled' });
      }
    },

    hold: reason =>
      set(state => (state.holds.includes(reason) ? state : { holds: [...state.holds, reason] })),

    release: reason => set(state => ({ holds: state.holds.filter(item => item !== reason) })),

    clear: () => {
      session += 1;
      if (factsTimer) {
        clearTimeout(factsTimer);
        factsTimer = null;
      }
      set({ ...initialState, holds: get().holds });
    },
  };
});

export const selectCurrentStep = (state: TutorialState): TutorialStep | null =>
  state.steps.find(step => step.key === state.currentStepKey) ?? null;
