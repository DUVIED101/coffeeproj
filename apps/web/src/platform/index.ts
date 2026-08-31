import type { Platform } from "@bystrobarista/core/platform";
import { webAlert } from "./alert";
import { webAppState } from "./appState";
import { webGeolocation } from "./geolocation";
import { webLocaleDetector } from "./localeDetector";
import { webPhotoPicker } from "./photoPicker";
import { webPush } from "./push";
import { webStorage } from "./storage";

export const WEB_APP_VERSION = "0.1.0";

const buildUserAgentTag = (): string => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "ssr";
  const browser = /Firefox\//.test(ua)
    ? "firefox"
    : /Edg\//.test(ua)
      ? "edge"
      : /Chrome\//.test(ua)
        ? "chrome"
        : /Safari\//.test(ua)
          ? "safari"
          : "unknown";
  return `BystroBarista/${WEB_APP_VERSION} web/${browser}`;
};

export const webPlatform: Platform = {
  storage: webStorage,
  push: webPush,
  geolocation: webGeolocation,
  photoPicker: webPhotoPicker,
  localeDetector: webLocaleDetector,
  appState: webAppState,
  alert: webAlert,
  userAgentTag: buildUserAgentTag(),
  appVersion: WEB_APP_VERSION,
};
