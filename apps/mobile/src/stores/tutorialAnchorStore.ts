import { create } from 'zustand';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import type { Rect } from '@bystrobarista/core/tutorial/placement';

export type AnchorMeasure = () => Promise<Rect | null>;

export type AnchorEntry = {
  id: number;
  key: TutorialAnchorKey;
  // Route the anchor lives on (NavigationRouteContext key); null for elements
  // outside any screen, e.g. the tab bar.
  routeKey: string | null;
  measure: AnchorMeasure;
};

type TutorialAnchorState = {
  entries: readonly AnchorEntry[];
  layoutVersion: number;
  register: (entry: Omit<AnchorEntry, 'id'>) => number;
  unregister: (id: number) => void;
  bumpLayoutVersion: () => void;
};

// Several mounted screens can register the same anchor key (stacks keep
// background screens alive). Prefer the focused route, then global anchors,
// then whatever is left — callers still filter by a usable rect.
export const pickAnchorEntries = (
  entries: readonly AnchorEntry[],
  key: TutorialAnchorKey,
  focusedRouteKey: string | null
): AnchorEntry[] => {
  const rank = (entry: AnchorEntry): number => {
    if (entry.routeKey !== null && entry.routeKey === focusedRouteKey) return 0;
    if (entry.routeKey === null) return 1;
    return 2;
  };
  return entries
    .filter(entry => entry.key === key)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry) - rank(b.entry) || a.index - b.index)
    .map(({ entry }) => entry);
};

let nextId = 1;

export const useTutorialAnchorStore = create<TutorialAnchorState>((set, get) => ({
  entries: [],
  layoutVersion: 0,
  register: entry => {
    const id = nextId++;
    set({ entries: [...get().entries, { ...entry, id }], layoutVersion: get().layoutVersion + 1 });
    return id;
  },
  unregister: id => set({ entries: get().entries.filter(entry => entry.id !== id) }),
  bumpLayoutVersion: () => set({ layoutVersion: get().layoutVersion + 1 }),
}));
