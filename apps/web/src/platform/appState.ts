import type {
  AppStateAdapter,
  AppStatus,
} from "@bystrobarista/core/platform/appState";

// Browser mapping: hidden tab ≈ backgrounded app. Core uses this to pause
// realtime channels and suppress in-app toasts while the tab isn't visible.
const currentStatus = (): AppStatus =>
  document.visibilityState === "hidden" ? "background" : "active";

export const webAppState: AppStateAdapter = {
  getCurrentState: currentStatus,
  addListener(handler) {
    const onChange = (): void => handler(currentStatus());
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  },
};
