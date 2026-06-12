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
import { PersonalDataPolicyScreen } from '../screens/settings/PersonalDataPolicyScreen';
import { DataConsentScreen } from '../screens/settings/DataConsentScreen';
import { SupportScreen } from '../screens/settings/SupportScreen';
import { MyDisputesScreen } from '../screens/shared/MyDisputesScreen';
import { DisputeDetailsScreen } from '../screens/shared/DisputeDetailsScreen';
import { DiagnosticScreen } from '../screens/settings/DiagnosticScreen';
import { COLORS } from '../config/constants';
import { useTranslation } from 'react-i18next';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Language: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  DeleteAccount: undefined;
  Visibility: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  PersonalDataPolicy: undefined;
  DataConsent: undefined;
  Support: undefined;
  MyDisputes: undefined;
  DisputeDetails: { applicationId?: string; disputeId?: string };
  Diagnostic: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => {
  const { t } = useTranslation();
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
      <Stack.Screen name="PersonalDataPolicy" component={PersonalDataPolicyScreen} />
      <Stack.Screen name="DataConsent" component={DataConsentScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="MyDisputes" component={MyDisputesScreen} />
      <Stack.Screen
        name="DisputeDetails"
        component={DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle') }}
      />
      <Stack.Screen name="Diagnostic" component={DiagnosticScreen} />
    </Stack.Navigator>
  );
};
