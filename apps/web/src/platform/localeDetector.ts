import type { LocaleDetector } from "@bystrobarista/core/platform/localeDetector";

export const webLocaleDetector: LocaleDetector = {
  detect() {
    try {
      const lang = navigator.languages?.[0] ?? navigator.language;
      if (!lang) return null;
      return lang.slice(0, 2).toLowerCase();
    } catch {
      return null;
    }
  },
};
