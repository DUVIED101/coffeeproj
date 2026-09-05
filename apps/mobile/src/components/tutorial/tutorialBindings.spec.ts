const mockNavigateTab = jest.fn();

jest.mock('../../navigation/navigationRef', () => ({
  navigateTab: (...args: unknown[]) => mockNavigateTab(...args),
}));

import { describeRoute, navigateToRoute, toTutorialRoute } from './tutorialBindings';

const nested = {
  index: 0,
  routes: [
    {
      key: 'Profile-1',
      name: 'Profile',
      state: {
        index: 1,
        routes: [
          { key: 'BaristaProfile-1', name: 'BaristaProfile' },
          {
            key: 'Settings-1',
            name: 'Settings',
            state: { index: 0, routes: [{ key: 'SettingsHome-1', name: 'SettingsHome' }] },
          },
        ],
      },
    },
    { key: 'Jobs-1', name: 'Jobs' },
  ],
};

describe('describeRoute', () => {
  it('walks to the focused leaf and reports its key', () => {
    expect(describeRoute(nested as never)).toEqual({
      path: ['Profile', 'Settings', 'SettingsHome'],
      routeKey: 'SettingsHome-1',
    });
  });

  it('falls back to the last route when index is missing and tolerates no nested state', () => {
    const partial = { routes: [{ name: 'Business' }, { name: 'Chats' }] };
    expect(describeRoute(partial as never)).toEqual({ path: ['Chats'], routeKey: null });
  });

  it('returns an empty path for an uninitialised container', () => {
    expect(describeRoute(undefined)).toEqual({ path: [], routeKey: null });
  });
});

describe('toTutorialRoute', () => {
  it.each([
    [['Profile', 'BaristaProfile'], 'profile'],
    [['Profile', 'BusinessProfileHome'], 'profile'],
    [['Profile', 'BaristaProfileSetup'], 'profileSetup'],
    [['Profile', 'Settings', 'Language'], 'settings'],
    [['Profile', 'BranchManagement'], 'branches'],
    [['Jobs'], 'jobFeed'],
    [['Jobs', 'JobFeed'], 'jobFeed'],
    [['Jobs', 'JobDetails'], 'jobDetails'],
    [['Jobs', 'Apply'], 'apply'],
    [['Applications', 'ApplicationsList'], 'applications'],
    [['Chats', 'Chat'], 'chats'],
    [['Business', 'BusinessHome'], 'businessHome'],
    [['Business', 'CreateJob'], 'createJob'],
    [['Business', 'Applicants'], 'applicants'],
    [['Baristas', 'BaristaFeed'], 'baristaFeed'],
    [['Baristas', 'ViewBaristaProfile'], 'baristaProfile'],
    [['Baristas', 'OfferJob'], 'offerJob'],
    [['Profile', 'NotificationFeed'], 'notifications'],
    [['Business', 'EditJob'], 'other'],
    [[], 'other'],
  ])('maps %j to %s', (path, expected) => {
    expect(toTutorialRoute(path)).toBe(expected);
  });
});

describe('navigateToRoute', () => {
  beforeEach(() => mockNavigateTab.mockReset());

  it('opens the role-specific profile root', () => {
    navigateToRoute('profile', 'business');
    expect(mockNavigateTab).toHaveBeenCalledWith('Profile', { screen: 'BusinessProfileHome' });
  });

  it('opens the barista profile wizard', () => {
    navigateToRoute('profileSetup', 'barista');
    expect(mockNavigateTab).toHaveBeenCalledWith('Profile', { screen: 'BaristaProfileSetup' });
  });

  it('sends job related routes to the feed', () => {
    navigateToRoute('apply', 'barista');
    expect(mockNavigateTab).toHaveBeenCalledWith('Jobs', { screen: 'JobFeed' });
  });

  it('ignores routes without a home', () => {
    navigateToRoute('other', 'barista');
    expect(mockNavigateTab).not.toHaveBeenCalled();
  });
});
