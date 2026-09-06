import { create } from 'zustand';
import { getPlatform } from '../platform';
import { FeatureFlagService } from '../services/FeatureFlagService';
import type { User } from '../types/user';
import { resolveWhatsNew } from '../whatsNew/engine';
import { CURRENT_RELEASE, type ReleaseNote } from '../whatsNew/releases';
import { useTutorialStore } from './tutorialStore';

const STORAGE_KEY = '@bystrobarista/whats-new-seen';
const FLAG_KEY = 'whats_new';
// Keeps the tutorial quiet until the sheet is dismissed or found unnecessary.
const TUTORIAL_HOLD = 'whatsNew';

export type WhatsNewStatus = 'idle' | 'checking' | 'visible' | 'done';

type WhatsNewState = {
  status: WhatsNewStatus;
  release: ReleaseNote | null;
  bootstrap: (user: Pick<User, 'createdAt'>) => Promise<void>;
  dismiss: () => Promise<void>;
  clear: () => void;
};

const rememberRelease = async (id: string): Promise<void> => {
  try {
    await getPlatform().storage.setItem(STORAGE_KEY, id);
  } catch (error) {
    console.warn('whatsNewStore: could not persist the seen release', error);
  }
};

export const useWhatsNewStore = create<WhatsNewState>((set, get) => ({
  status: 'idle',
  release: null,

  bootstrap: async user => {
    if (get().status !== 'idle') return;
    set({ status: 'checking' });
    useTutorialStore.getState().hold(TUTORIAL_HOLD);
    try {
      const [enabled, lastSeenId] = await Promise.all([
        FeatureFlagService.isEnabled(FLAG_KEY),
        getPlatform().storage.getItem(STORAGE_KEY),
      ]);
      const decision = enabled
        ? resolveWhatsNew({ lastSeenId, release: CURRENT_RELEASE, userCreatedAt: user.createdAt })
        : 'none';
      if (get().status !== 'checking') return;
      if (decision === 'show') {
        set({ status: 'visible', release: CURRENT_RELEASE });
        return;
      }
      if (decision === 'markSeen') await rememberRelease(CURRENT_RELEASE.id);
      set({ status: 'done' });
    } catch (error) {
      console.warn('whatsNewStore: bootstrap failed', error);
      if (get().status === 'checking') set({ status: 'done' });
    } finally {
      if (get().status !== 'visible') useTutorialStore.getState().release(TUTORIAL_HOLD);
    }
  },

  dismiss: async () => {
    const { status, release } = get();
    if (status !== 'visible' || !release) return;
    set({ status: 'done' });
    useTutorialStore.getState().release(TUTORIAL_HOLD);
    await rememberRelease(release.id);
  },

  clear: () => {
    useTutorialStore.getState().release(TUTORIAL_HOLD);
    set({ status: 'idle', release: null });
  },
}));
