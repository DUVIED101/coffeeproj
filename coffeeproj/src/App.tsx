import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LogBox, Text, TextInput } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

// Project-wide Dynamic Type cap: iOS users with the largest accessibility
// font sizes (xxxLarge / AX5) can otherwise multiply text up to 3.5×, which
// shatters tight layouts (bottom tabs, status badges, list cards). 1.5× is
// generous for readability while staying inside designed bounds. Individual
// components can override with maxFontSizeMultiplier on the <Text> if needed.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const textWithDefaults = Text as unknown as { defaultProps?: Record<string, unknown> };
textWithDefaults.defaultProps = textWithDefaults.defaultProps ?? {};
textWithDefaults.defaultProps.maxFontSizeMultiplier = 1.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tiWithDefaults = TextInput as unknown as { defaultProps?: Record<string, unknown> };
tiWithDefaults.defaultProps = tiWithDefaults.defaultProps ?? {};
tiWithDefaults.defaultProps.maxFontSizeMultiplier = 1.5;

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
import { registerAuthListener } from './stores/authStore';
import { migrateSessionKey } from './utils/migrateSessionKey';
import { InAppToast } from './components/InAppToast';
import { ShiftConfirmationGate } from './components/ShiftConfirmationGate';
import { SuspendedUserBanner } from './components/SuspendedUserBanner';
import { BannedUserBlocker } from './components/BannedUserBlocker';
import { JobOfferService } from './services/JobOfferService';
import { pendingOfferActionsQueue } from './services/pendingOfferActionsQueue';
import { useNotificationFeedStore } from './stores/notificationFeedStore';
import { useDiagnosticsStore } from './stores/diagnosticsStore';
import { warmSupabaseConnection } from './utils/warmConnection';
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
        <SuspendedUserBanner>
          <AppNavigator />
        </SuspendedUserBanner>
        <InAppToast />
        <ShiftConfirmationGate />
        <BannedUserBlocker />
      </View>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  root: { flex: 1 },
});

// Hard ceiling for the async bootstrap chain (migrateSessionKey → host
// pick → supabase client init → initI18n). If any of those hang on a flaky
// platform call, we still mount AppContent so authStore.initialize can run
// and surface ConnectionErrorScreen via the existing Phase 1 timeout path.
// Without this, a hung AsyncStorage call would leave the UI stuck on the
// iOS LaunchScreen indefinitely.
const BOOTSTRAP_HARD_TIMEOUT_MS = 5000;

function App(): React.JSX.Element {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    // Fire TLS/HTTP-2 warmup IMMEDIATELY, before any storage I/O. This
    // overlaps connection establishment with migrateSessionKey + initI18n
    // so the first auth fetch lands on a warm socket.
    warmSupabaseConnection();
    let mounted = true;
    const bootstrap = async (): Promise<void> => {
      // migrateSessionKey must finish before any supabase.auth call reads
      // storage, otherwise existing users boot signed-out and the listener
      // misses their initial SIGNED_IN event.
      try {
        await migrateSessionKey();
      } catch (error) {
        console.warn('session-key migration failed', error);
      }
      // Listener attaches AFTER migration so it doesn't race supabase-js's
      // own async initialize().
      try {
        registerAuthListener();
      } catch (error) {
        console.warn('auth-listener registration failed', error);
      }
      try {
        await initI18n();
      } catch (error) {
        console.warn('i18n init failed', error);
      }
    };
    const hardTimeout = new Promise<void>(resolve =>
      setTimeout(resolve, BOOTSTRAP_HARD_TIMEOUT_MS)
    );
    void Promise.race([bootstrap(), hardTimeout]).finally(() => {
      if (!mounted) return;
      setBootstrapped(true);
      void useDiagnosticsStore.getState().loadLastReport();
      // Defer the connectivity probe: its 3-4 parallel fetches otherwise
      // race fetchUserProfile on the same channel, adding ~1.5s on RU proxy.
      // 3s is enough for auth to land first; probe is diagnostics-only.
      setTimeout(() => {
        if (!mounted) return;
        void useDiagnosticsStore.getState().runProbe();
      }, 3000);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!bootstrapped) {
    return <></>;
  }

  return <AppContent />;
}

export default App;
