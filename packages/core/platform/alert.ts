export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

// Modal message shim. Mobile: react-native Alert. Web: a headless bridge that
// resolves into an app-level modal (or window.alert as a last resort).
export type AlertAdapter = {
  show(title: string, message?: string, buttons?: AlertButton[]): void;
};
