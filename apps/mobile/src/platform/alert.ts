import { Alert as RNAlert } from 'react-native';
import type { AlertAdapter } from '@bystrobarista/core/platform/alert';

export const nativeAlert: AlertAdapter = {
  show(title, message, buttons) {
    const rnButtons = buttons?.map(b => ({
      text: b.text,
      style: b.style,
      onPress: b.onPress,
    }));
    RNAlert.alert(title, message, rnButtons);
  },
};
