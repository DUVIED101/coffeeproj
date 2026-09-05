import { pickAnchorEntries, useTutorialAnchorStore, type AnchorEntry } from './tutorialAnchorStore';

const measure = async () => null;

const entry = (id: number, key: AnchorEntry['key'], routeKey: string | null): AnchorEntry => ({
  id,
  key,
  routeKey,
  measure,
});

describe('pickAnchorEntries', () => {
  it('orders the focused route first, then global anchors, then the rest', () => {
    const entries = [
      entry(1, 'header.bell', 'route-b'),
      entry(2, 'header.bell', null),
      entry(3, 'header.bell', 'route-a'),
      entry(4, 'tab.jobs', null),
    ];
    expect(pickAnchorEntries(entries, 'header.bell', 'route-a').map(e => e.id)).toEqual([3, 2, 1]);
  });

  it('keeps registration order within the same rank', () => {
    const entries = [entry(1, 'feed.firstJob', 'x'), entry(2, 'feed.firstJob', 'y')];
    expect(pickAnchorEntries(entries, 'feed.firstJob', null).map(e => e.id)).toEqual([1, 2]);
  });

  it('returns nothing for an unregistered key', () => {
    expect(pickAnchorEntries([entry(1, 'tab.jobs', null)], 'tab.chats', null)).toEqual([]);
  });
});

describe('useTutorialAnchorStore', () => {
  beforeEach(() => {
    useTutorialAnchorStore.setState({ entries: [], layoutVersion: 0 });
  });

  it('registers and unregisters entries and bumps the layout version on register', () => {
    const store = useTutorialAnchorStore.getState();
    const id = store.register({ key: 'tab.jobs', routeKey: null, measure });
    expect(useTutorialAnchorStore.getState().entries.map(e => [e.id, e.key])).toEqual([
      [id, 'tab.jobs'],
    ]);
    expect(useTutorialAnchorStore.getState().layoutVersion).toBe(1);

    useTutorialAnchorStore.getState().unregister(id);
    expect(useTutorialAnchorStore.getState().entries).toEqual([]);
  });
});
