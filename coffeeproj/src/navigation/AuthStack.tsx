import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountTypeScreen } from '../screens/auth/AccountTypeScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { PasswordResetScreen } from '../screens/auth/PasswordResetScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { EmployerSubtypeScreen } from '../screens/auth/EmployerSubtypeScreen';
import { EmployerDetailsScreen } from '../screens/auth/EmployerDetailsScreen';
import type { AccountType, LegalForm } from '../types';

export type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
  PasswordReset: { email: string };
  EmployerSubtype: {
    email: string;
    password?: string;
    phoneNumber?: string;
    hasSession?: boolean;
  };
  EmployerDetails: {
    email: string;
    password?: string;
    phoneNumber?: string;
    legalForm: LegalForm;
    hasSession?: boolean;
  };
  EmailVerification: { email: string; accountType: AccountType };
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
      <Stack.Screen name="EmployerSubtype" component={EmployerSubtypeScreen} />
      <Stack.Screen name="EmployerDetails" component={EmployerDetailsScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
};
