import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileBootstrapScreen } from '../screens/auth/ProfileBootstrapScreen';
import { TermsScreen } from '../screens/settings/TermsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { PersonalDataPolicyScreen } from '../screens/settings/PersonalDataPolicyScreen';
import { DataConsentScreen } from '../screens/settings/DataConsentScreen';
import { COLORS } from '../config/constants';

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
    <Stack.Screen name="Bootstrap" component={ProfileBootstrapScreen} />
    <Stack.Screen name="Terms" component={TermsScreen} options={legalScreenOptions} />
    <Stack.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicyScreen}
      options={legalScreenOptions}
    />
    <Stack.Screen
      name="PersonalDataPolicy"
      component={PersonalDataPolicyScreen}
      options={legalScreenOptions}
    />
    <Stack.Screen name="DataConsent" component={DataConsentScreen} options={legalScreenOptions} />
  </Stack.Navigator>
);
