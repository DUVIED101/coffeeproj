import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { LanguageScreen } from '../screens/settings/LanguageScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { NotificationsScreen } from '../screens/settings/NotificationsScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { VisibilityScreen } from '../screens/settings/VisibilityScreen';
import { TermsScreen } from '../screens/settings/TermsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { SupportScreen } from '../screens/settings/SupportScreen';
import { COLORS } from '../config/constants';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Language: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  DeleteAccount: undefined;
  Visibility: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  Support: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="Visibility" component={VisibilityScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
};
