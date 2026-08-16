import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import type { PushNotificationPayload } from '../types/notification';

export const navigationRef = createNavigationContainerRef();

let pendingPayload: PushNotificationPayload | null = null;

const navigateTab = (tabName: string, child?: { screen: string; params?: object }): void => {
  if (!navigationRef.isReady()) return;
  // `initial: false` tells the nested stack navigator to keep its initialRouteName
  // (e.g. ConversationsList) at the bottom of the back stack, so back from a
  // deep screen (e.g. Chat) pops within the stack rather than falling through
  // to whichever tab was previously focused.
  const params = child ? { ...child, initial: false } : undefined;
  navigationRef.dispatch(
    CommonActions.navigate({
      name: tabName,
      params,
    })
  );
};

export const dispatchPayload = (payload: PushNotificationPayload): void => {
  const accountType = useAuthStore.getState().user?.accountType;
  const kind = payload.data?.kind ?? payload.kind;
  const conversationId = payload.data?.conversationId;
  const jobId = payload.data?.jobId;
  const offerId = payload.data?.offerId;
  const applicationId = payload.data?.applicationId;
  const disputeId = payload.data?.disputeId;
  const jobTitle = payload.data?.jobTitle;
  const shiftStartIso = payload.data?.shiftStartIso;

  if (kind === 'new_message' || kind === 'conversation_started') {
    if (conversationId) {
      navigateTab('Chats', { screen: 'Chat', params: { conversationId } });
    } else {
      navigateTab('Chats', { screen: 'ConversationsList' });
    }
    return;
  }

  if (kind === 'job_offer_received') {
    if (offerId) {
      navigateTab('Jobs', { screen: 'JobOffer', params: { offerId } });
    } else {
      navigateTab('Jobs');
    }
    return;
  }

  if (kind === 'job_offer_accepted' || kind === 'job_offer_declined') {
    if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
    }
    return;
  }

  if (kind === 'new_application' || kind === 'application_withdrawn') {
    if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
    }
    return;
  }

  if (kind === 'new_review') {
    if (accountType === 'barista') {
      navigateTab('Profile');
    } else {
      navigateTab('Profile');
    }
    return;
  }

  if (
    kind === 'application_accepted' ||
    kind === 'application_rejected' ||
    kind === 'work_completion_requested' ||
    kind === 'work_completion_confirmed' ||
    kind === 'shift_cancelled'
  ) {
    if (accountType === 'barista') {
      navigateTab('Jobs', { screen: 'Applications' });
    } else if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
    }
    return;
  }

  if (kind === 'shift_reminder_24h' || kind === 'shift_reminder_3h') {
    if (accountType === 'barista') {
      if (applicationId) {
        navigateTab('Jobs', { screen: 'ApplicationDetails', params: { applicationId } });
      } else {
        navigateTab('Jobs', { screen: 'Applications' });
      }
    } else if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
    }
    return;
  }

  if (kind === 'shift_confirmation_required') {
    if (applicationId) {
      navigateTab('Jobs', { screen: 'ApplicationDetails', params: { applicationId } });
    } else {
      navigateTab('Jobs', { screen: 'Applications' });
    }
    return;
  }

  if (kind === 'shift_confirmed' || kind === 'shift_declined') {
    if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
    }
    return;
  }

  if (kind === 'dispute_filed') {
    if (disputeId) {
      navigateTab('Profile', { screen: 'DisputeDetails', params: { disputeId } });
    } else if (applicationId) {
      navigateTab('Profile', { screen: 'DisputeDetails', params: { applicationId } });
    } else {
      navigateTab('Profile');
    }
    return;
  }

  if (kind === 'shift_no_response_alert') {
    if (applicationId && jobTitle && shiftStartIso) {
      navigateTab('Business', {
        screen: 'ShiftAlert',
        params: { applicationId, jobTitle, shiftStartIso },
      });
    } else if (jobId) {
      navigateTab('Business', { screen: 'Applicants', params: { jobId } });
    } else {
      navigateTab('Business');
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
