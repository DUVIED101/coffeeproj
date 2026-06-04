import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

// RN 0.73 + iOS 18+ leaks pending callbacks from AccessibilityInfo when the
// app backgrounds (e.g. during OAuth SFSafariViewController). Dev-only noise
// that covers the screen with a yellow LogBox; harmless in production.
LogBox.ignoreLogs([/Excessive number of pending callbacks/]);
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { AppNavigator } from './navigation/AppNavigator';
import { useNotificationSetup } from './hooks/useNotificationSetup';
import { routePushPayload, navigationRef } from './navigation/navigationRef';
import { CommonActions } from '@react-navigation/native';
import { initI18n } from './i18n';
import { InAppToast } from './components/InAppToast';
import { ShiftConfirmationGate } from './components/ShiftConfirmationGate';
import { JobOfferService } from './services/JobOfferService';
import { pendingOfferActionsQueue } from './services/pendingOfferActionsQueue';
import { useNotificationFeedStore } from './stores/notificationFeedStore';
import { JOB_OFFER_ACTION_ACCEPT, JOB_OFFER_ACTION_DECLINE } from './types/notification';
import type { PushNotificationPayload } from './types/notification';
import type { ApplicationId, JobOfferId } from './types/ids';
import 'react-native-gesture-handler';

const navigateToChatForApplication = (applicationId: ApplicationId): void => {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Chats',
      params: {
        screen: 'Chat',
        initial: false,
        params: { applicationId },
      },
    })
  );
};

const removeDeliveredOfferNotification = (offerId: JobOfferId): void => {
  try {
    PushNotificationIOS.getDeliveredNotifications(delivered => {
      const ids = delivered
        .filter(d => {
          const data = d.userInfo as { offerId?: string } | undefined;
          return data?.offerId === offerId;
        })
        .map(d => d.identifier)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (ids.length > 0) {
        PushNotificationIOS.removeDeliveredNotifications(ids);
      }
    });
  } catch (error) {
    console.warn('removeDeliveredOfferNotification failed', error);
  }
};

const handleJobOfferAction = async (
  offerId: JobOfferId,
  actionId: typeof JOB_OFFER_ACTION_ACCEPT | typeof JOB_OFFER_ACTION_DECLINE
): Promise<void> => {
  const response = actionId === JOB_OFFER_ACTION_ACCEPT ? 'accepted' : 'declined';
  try {
    const result = await JobOfferService.respondToOffer(offerId, response);
    if (response === 'declined') {
      removeDeliveredOfferNotification(offerId);
      try {
        await useNotificationFeedStore.getState().deleteByOfferId(offerId);
      } catch (cleanupError) {
        console.warn('feed deleteByOfferId failed', cleanupError);
      }
      return;
    }
    if (result.status === 'accepted') {
      navigateToChatForApplication(result.applicationId);
    }
  } catch (error) {
    console.warn('handleJobOfferAction failed, enqueueing for retry', error);
    await pendingOfferActionsQueue.enqueue({ offerId, response });
  }
};

const handlePushNotification = (payload: PushNotificationPayload): void => {
  const offerId = payload.data?.offerId;
  const actionId = payload.actionIdentifier;

  if (offerId && (actionId === JOB_OFFER_ACTION_ACCEPT || actionId === JOB_OFFER_ACTION_DECLINE)) {
    void handleJobOfferAction(offerId, actionId);
    return;
  }

  routePushPayload(payload);
};

const drainPendingOfferActions = (): void => {
  void pendingOfferActionsQueue.drain(async action => {
    await JobOfferService.respondToOffer(action.offerId, action.response);
    if (action.response === 'declined') {
      removeDeliveredOfferNotification(action.offerId);
      try {
        await useNotificationFeedStore.getState().deleteByOfferId(action.offerId);
      } catch (cleanupError) {
        console.warn('drain cleanup failed', cleanupError);
      }
    }
  });
};

function AppContent(): React.JSX.Element {
  useNotificationSetup({ onNotification: handlePushNotification });
  useEffect(() => {
    drainPendingOfferActions();
  }, []);
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={appStyles.root}>
        <AppNavigator />
        <InAppToast />
        <ShiftConfirmationGate />
      </View>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  root: { flex: 1 },
});

function App(): React.JSX.Element {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return <></>;
  }

  return <AppContent />;
}

export default App;
