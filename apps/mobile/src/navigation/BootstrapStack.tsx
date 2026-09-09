import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '@bystrobarista/core/config/constants';

export type BootstrapStackParamList = {
  Bootstrap: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  PersonalDataPolicy: undefined;
  DataConsent: undefined;
};

const Stack = createNativeStackNavigator<BootstrapStackParamList>();

const legalScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
  headerShadowVisible: false,
};

// Wraps ProfileBootstrap so the consent gate inside it can navigate to the
// full-text legal screens (Terms / Privacy / DataConsent) before the user is
// allowed into MainTabs. ProfileBootstrap renders without a stack normally
// because it has nothing to navigate to — adding the stack only for this
// short window keeps the auth-state machine simple.
export const BootstrapStack: React.FC = () => (
  <Stack.Navigator initialRouteName="Bootstrap" screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="Bootstrap"
      getComponent={() => require('../screens/auth/ProfileBootstrapScreen').ProfileBootstrapScreen}
    />
    <Stack.Screen
      name="Terms"
      getComponent={() => require('../screens/settings/TermsScreen').TermsScreen}
      options={legalScreenOptions}
    />
    <Stack.Screen
      name="PrivacyPolicy"
      getComponent={() => require('../screens/settings/PrivacyPolicyScreen').PrivacyPolicyScreen}
      options={legalScreenOptions}
    />
    <Stack.Screen
      name="PersonalDataPolicy"
      getComponent={() =>
        require('../screens/settings/PersonalDataPolicyScreen').PersonalDataPolicyScreen
      }
      options={legalScreenOptions}
    />
    <Stack.Screen
      name="DataConsent"
      getComponent={() => require('../screens/settings/DataConsentScreen').DataConsentScreen}
      options={legalScreenOptions}
    />
  </Stack.Navigator>
);
