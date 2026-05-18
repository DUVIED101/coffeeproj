import React, { useEffect, useState } from 'react';
import { AppNavigator } from './navigation/AppNavigator';
import { useNotificationSetup } from './hooks/useNotificationSetup';
import { routePushPayload } from './navigation/navigationRef';
import { initI18n } from './i18n';
import type { PushNotificationPayload } from './types/notification';
import 'react-native-gesture-handler';

const handlePushNotification = (payload: PushNotificationPayload): void => {
  routePushPayload(payload);
};

function AppContent(): React.JSX.Element {
  useNotificationSetup({ onNotification: handlePushNotification });
  return <AppNavigator />;
}

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
