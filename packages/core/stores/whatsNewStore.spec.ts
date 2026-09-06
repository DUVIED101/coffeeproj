import { _resetPlatformForTests, setPlatform } from '../platform';
import { createTestPlatform } from '../platform/testing';
import { FeatureFlagService } from '../services/FeatureFlagService';
import { CURRENT_RELEASE } from '../whatsNew/releases';
import { useTutorialStore } from './tutorialStore';
import { useWhatsNewStore } from './whatsNewStore';

jest.mock('../services/FeatureFlagService', () => ({
  FeatureFlagService: { isEnabled: jest.fn() },
}));

const isEnabled = FeatureFlagService.isEnabled as jest.MockedFunction<
  typeof FeatureFlagService.isEnabled
>;

const STORAGE_KEY = '@bystrobarista/whats-new-seen';
const DAY_MS = 24 * 60 * 60 * 1000;
const releasedAt = Date.parse(CURRENT_RELEASE.releasedAt);
const existingUser = { createdAt: new Date(releasedAt - 30 * DAY_MS).toISOString() };
const newUser = { createdAt: new Date(releasedAt + DAY_MS).toISOString() };

describe('whatsNewStore', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    _resetPlatformForTests();
    const test = createTestPlatform();
    storage = test.storageStore;
    setPlatform(test.platform);
    isEnabled.mockReset();
    isEnabled.mockResolvedValue(true);
    useWhatsNewStore.setState({ status: 'idle', release: null });
    useTutorialStore.setState({ holds: [] });
  });

  it('shows the sheet to an existing user and holds the tutorial until it is dismissed', async () => {
    await useWhatsNewStore.getState().bootstrap(existingUser);
    expect(useWhatsNewStore.getState()).toMatchObject({
      status: 'visible',
      release: CURRENT_RELEASE,
    });
    expect(useTutorialStore.getState().holds).toEqual(['whatsNew']);
    expect(storage.get(STORAGE_KEY)).toBeUndefined();

    await useWhatsNewStore.getState().dismiss();
    expect(useWhatsNewStore.getState().status).toBe('done');
    expect(useTutorialStore.getState().holds).toEqual([]);
    expect(storage.get(STORAGE_KEY)).toBe(CURRENT_RELEASE.id);
  });

  it('remembers the release silently for a fresh install by a new user', async () => {
    await useWhatsNewStore.getState().bootstrap(newUser);
    expect(useWhatsNewStore.getState()).toMatchObject({ status: 'done', release: null });
    expect(storage.get(STORAGE_KEY)).toBe(CURRENT_RELEASE.id);
    expect(useTutorialStore.getState().holds).toEqual([]);
  });

  it('does nothing when this release was already shown on the device', async () => {
    storage.set(STORAGE_KEY, CURRENT_RELEASE.id);
    await useWhatsNewStore.getState().bootstrap(existingUser);
    expect(useWhatsNewStore.getState().status).toBe('done');
    expect(useTutorialStore.getState().holds).toEqual([]);
  });

  it('stays silent when the feature flag is off', async () => {
    isEnabled.mockResolvedValue(false);
    await useWhatsNewStore.getState().bootstrap(existingUser);
    expect(useWhatsNewStore.getState().status).toBe('done');
    expect(storage.get(STORAGE_KEY)).toBeUndefined();
    expect(useTutorialStore.getState().holds).toEqual([]);
  });

  it('never blocks the app when the flag lookup fails', async () => {
    isEnabled.mockRejectedValue(new Error('offline'));
    await useWhatsNewStore.getState().bootstrap(existingUser);
    expect(useWhatsNewStore.getState().status).toBe('done');
    expect(useTutorialStore.getState().holds).toEqual([]);
  });

  it('clear releases the tutorial and resets for the next sign-in', async () => {
    await useWhatsNewStore.getState().bootstrap(existingUser);
    useWhatsNewStore.getState().clear();
    expect(useWhatsNewStore.getState()).toMatchObject({ status: 'idle', release: null });
    expect(useTutorialStore.getState().holds).toEqual([]);
  });
});
