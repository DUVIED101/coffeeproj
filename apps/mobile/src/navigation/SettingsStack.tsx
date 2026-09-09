import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '@bystrobarista/core/config/constants';
import { useTranslation } from 'react-i18next';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Language: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  DeleteAccount: undefined;
  Visibility: undefined;
  BlockedUsers: undefined;
  Documents: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  PersonalDataPolicy: undefined;
  DataConsent: undefined;
  Support: undefined;
  MyDisputes: undefined;
  MyReports: undefined;
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
      <Stack.Screen
        name="SettingsHome"
        getComponent={() => require('../screens/settings/SettingsScreen').SettingsScreen}
      />
      <Stack.Screen
        name="Language"
        getComponent={() => require('../screens/settings/LanguageScreen').LanguageScreen}
      />
      <Stack.Screen
        name="ChangePassword"
        getComponent={() =>
          require('../screens/settings/ChangePasswordScreen').ChangePasswordScreen
        }
      />
      <Stack.Screen
        name="Notifications"
        getComponent={() => require('../screens/settings/NotificationsScreen').NotificationsScreen}
      />
      <Stack.Screen
        name="DeleteAccount"
        getComponent={() => require('../screens/settings/DeleteAccountScreen').DeleteAccountScreen}
      />
      <Stack.Screen
        name="Visibility"
        getComponent={() => require('../screens/settings/VisibilityScreen').VisibilityScreen}
      />
      <Stack.Screen
        name="BlockedUsers"
        getComponent={() => require('../screens/settings/BlockedUsersScreen').BlockedUsersScreen}
      />
      <Stack.Screen
        name="Documents"
        getComponent={() => require('../screens/settings/DocumentsScreen').DocumentsScreen}
      />
      <Stack.Screen
        name="Terms"
        getComponent={() => require('../screens/settings/TermsScreen').TermsScreen}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => require('../screens/settings/PrivacyPolicyScreen').PrivacyPolicyScreen}
      />
      <Stack.Screen
        name="PersonalDataPolicy"
        getComponent={() =>
          require('../screens/settings/PersonalDataPolicyScreen').PersonalDataPolicyScreen
        }
      />
      <Stack.Screen
        name="DataConsent"
        getComponent={() => require('../screens/settings/DataConsentScreen').DataConsentScreen}
      />
      <Stack.Screen
        name="Support"
        getComponent={() => require('../screens/settings/SupportScreen').SupportScreen}
      />
      <Stack.Screen
        name="MyDisputes"
        getComponent={() => require('../screens/shared/MyDisputesScreen').MyDisputesScreen}
      />
      <Stack.Screen
        name="MyReports"
        getComponent={() => require('../screens/settings/MyReportsScreen').MyReportsScreen}
      />
      <Stack.Screen
        name="DisputeDetails"
        getComponent={() => require('../screens/shared/DisputeDetailsScreen').DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle') }}
      />
      <Stack.Screen
        name="Diagnostic"
        getComponent={() => require('../screens/settings/DiagnosticScreen').DiagnosticScreen}
      />
    </Stack.Navigator>
  );
};
