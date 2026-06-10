import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountTypeScreen } from '../screens/auth/AccountTypeScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { PasswordResetScreen } from '../screens/auth/PasswordResetScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { DiagnosticScreen } from '../screens/settings/DiagnosticScreen';
import type { AccountType } from '../types';

export type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
  PasswordReset: { email: string };
  EmailVerification: { email: string; accountType: AccountType };
  Diagnostic: undefined;
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
      <Stack.Screen name="AccountType" component={AccountTypeScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="Diagnostic" component={DiagnosticScreen} />
    </Stack.Navigator>
  );
};
