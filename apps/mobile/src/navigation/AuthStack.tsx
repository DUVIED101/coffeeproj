import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { AccountType } from '@bystrobarista/core/types';

export type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
  PasswordReset: { email: string };
  EmailVerification: { email: string; accountType: AccountType };
  Diagnostic: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  DataConsent: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="AccountType"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="AccountType"
        getComponent={() => require('../screens/auth/AccountTypeScreen').AccountTypeScreen}
      />
      <Stack.Screen
        name="Signup"
        getComponent={() => require('../screens/auth/SignupScreen').SignupScreen}
      />
      <Stack.Screen
        name="Login"
        getComponent={() => require('../screens/auth/LoginScreen').LoginScreen}
      />
      <Stack.Screen
        name="PasswordReset"
        getComponent={() => require('../screens/auth/PasswordResetScreen').PasswordResetScreen}
      />
      <Stack.Screen
        name="EmailVerification"
        getComponent={() =>
          require('../screens/auth/EmailVerificationScreen').EmailVerificationScreen
        }
      />
      <Stack.Screen
        name="Diagnostic"
        getComponent={() => require('../screens/settings/DiagnosticScreen').DiagnosticScreen}
      />
      <Stack.Screen
        name="Terms"
        getComponent={() => require('../screens/settings/TermsScreen').TermsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => require('../screens/settings/PrivacyPolicyScreen').PrivacyPolicyScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="DataConsent"
        getComponent={() => require('../screens/settings/DataConsentScreen').DataConsentScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};
