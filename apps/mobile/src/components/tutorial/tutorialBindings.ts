import type { NavigationState, PartialState } from '@react-navigation/native';
import type { TutorialRole, TutorialRouteKey } from '@bystrobarista/core/types/tutorial';
import { navigateTab } from '../../navigation/navigationRef';

type AnyNavigationState = NavigationState | PartialState<NavigationState> | undefined;

export type RouteDescription = {
  // Route names from the tab navigator down to the focused leaf.
  path: string[];
  routeKey: string | null;
};

export const describeRoute = (state: AnyNavigationState): RouteDescription => {
  const path: string[] = [];
  let routeKey: string | null = null;
  let current: AnyNavigationState = state;
  while (current?.routes?.length) {
    const index = current.index ?? current.routes.length - 1;
    const route = current.routes[index];
    if (!route) break;
    path.push(route.name);
    if (typeof route.key === 'string') routeKey = route.key;
    current = route.state as AnyNavigationState;
  }
  return { path, routeKey };
};

const ROUTE_BY_SCREEN: Readonly<Record<string, TutorialRouteKey>> = {
  Profile: 'profile',
  BaristaProfile: 'profile',
  BusinessProfileHome: 'profile',
  BaristaProfileSetup: 'profileSetup',
  BusinessProfileSetup: 'profileSetup',
  Jobs: 'jobFeed',
  JobFeed: 'jobFeed',
  JobDetails: 'jobDetails',
  Apply: 'apply',
  Applications: 'applications',
  ApplicationsList: 'applications',
  Chats: 'chats',
  ConversationsList: 'chats',
  Chat: 'chats',
  NotificationFeed: 'notifications',
  Business: 'businessHome',
  BusinessHome: 'businessHome',
  CreateJob: 'createJob',
  BranchManagement: 'branches',
  Baristas: 'baristaFeed',
  BaristaFeed: 'baristaFeed',
  ViewBaristaProfile: 'baristaProfile',
  OfferJob: 'offerJob',
  Applicants: 'applicants',
};

export const toTutorialRoute = (path: readonly string[]): TutorialRouteKey => {
  if (path.includes('Settings')) return 'settings';
  const leaf = path[path.length - 1];
  return (leaf && ROUTE_BY_SCREEN[leaf]) || 'other';
};

const profileScreen = (role: TutorialRole): string =>
  role === 'business' ? 'BusinessProfileHome' : 'BaristaProfile';

export const navigateToRoute = (route: TutorialRouteKey, role: TutorialRole): void => {
  switch (route) {
    case 'profile':
      navigateTab('Profile', { screen: profileScreen(role) });
      return;
    case 'profileSetup':
      navigateTab('Profile', {
        screen: role === 'business' ? 'BusinessProfileSetup' : 'BaristaProfileSetup',
      });
      return;
    case 'branches':
      navigateTab('Profile', { screen: 'BranchManagement' });
      return;
    case 'notifications':
      navigateTab('Profile', { screen: 'NotificationFeed' });
      return;
    case 'settings':
      navigateTab('Profile', { screen: 'Settings' });
      return;
    case 'jobFeed':
    case 'jobDetails':
    case 'apply':
      navigateTab('Jobs', { screen: 'JobFeed' });
      return;
    case 'applications':
      navigateTab('Applications', { screen: 'ApplicationsList' });
      return;
    case 'chats':
      navigateTab('Chats', { screen: 'ConversationsList' });
      return;
    case 'businessHome':
    case 'applicants':
      navigateTab('Business', { screen: 'BusinessHome' });
      return;
    case 'createJob':
      navigateTab('Business', { screen: 'CreateJob' });
      return;
    case 'baristaFeed':
    case 'baristaProfile':
    case 'offerJob':
      navigateTab('Baristas', { screen: 'BaristaFeed' });
      return;
    case 'other':
      return;
  }
};
