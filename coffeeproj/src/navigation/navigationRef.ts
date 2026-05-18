import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import type { PushNotificationPayload } from '../types/notification';

export const navigationRef = createNavigationContainerRef();

let pendingPayload: PushNotificationPayload | null = null;

const navigateTab = (tabName: string, child?: { screen: string; params?: object }): void => {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({
      name: tabName,
      params: child,
    })
  );
};

const dispatchPayload = (payload: PushNotificationPayload): void => {
  const accountType = useAuthStore.getState().user?.accountType;
  const kind = payload.data?.kind ?? payload.kind;
  const conversationId = payload.data?.conversationId;

  const stackTab = accountType === 'business' ? 'Business' : 'Jobs';

  if (kind === 'new_message') {
    if (conversationId) {
      navigateTab(stackTab, { screen: 'Chat', params: { conversationId } });
    } else {
      navigateTab(stackTab, { screen: 'ConversationsList' });
    }
    return;
  }

  if (
    kind === 'application_accepted' ||
    kind === 'application_rejected' ||
    kind === 'work_completion_requested' ||
    kind === 'work_completion_confirmed'
  ) {
    if (accountType === 'barista') {
      navigateTab('Jobs', { screen: 'Applications' });
    } else {
      navigateTab(stackTab);
    }
    return;
  }

  navigateTab('Profile');
};

/**
 * Route a push payload. Only navigates when the user actually tapped the
 * notification (`userInteraction === true`); foreground arrivals just surface
 * the system banner without yanking the user out of what they're doing.
 *
 * If the navigator is not ready yet (cold-start tap arriving before
 * NavigationContainer mounts), the payload is queued for delivery after
 * `flushPendingPushPayload` fires from NavigationContainer's onReady.
 */
export const routePushPayload = (payload: PushNotificationPayload): void => {
  if (!payload.userInteraction) return;
  if (!navigationRef.isReady()) {
    pendingPayload = payload;
    return;
  }
  dispatchPayload(payload);
};

export const flushPendingPushPayload = (): void => {
  if (!pendingPayload) return;
  const payload = pendingPayload;
  pendingPayload = null;
  dispatchPayload(payload);
};
