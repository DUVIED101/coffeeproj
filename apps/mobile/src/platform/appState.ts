import { AppState, type AppStateStatus } from 'react-native';
import type { AppStateAdapter, AppStatus } from '@bystrobarista/core/platform/appState';

// RN reports 'unknown' on cold-start of some older iOS versions; treat as 'inactive'.
const mapStatus = (raw: AppStateStatus | 'unknown'): AppStatus => {
  if (raw === 'active') return 'active';
  if (raw === 'background') return 'background';
  return 'inactive';
};

export const nativeAppState: AppStateAdapter = {
  getCurrentState: () => mapStatus(AppState.currentState),
  addListener(handler) {
    const subscription = AppState.addEventListener('change', status => {
      handler(mapStatus(status));
    });
    return () => subscription.remove();
  },
};
