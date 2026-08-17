export type LocaleDetector = {
  // Two-letter language subtag (`ru`, `en`, ...) or null if the platform can't tell.
  detect(): string | null;
};
