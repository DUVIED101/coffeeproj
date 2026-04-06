import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BaristaProfileScreen } from '../screens/barista/BaristaProfileScreen';
import { BaristaProfileSetupScreen } from '../screens/barista/BaristaProfileSetupScreen';
import { COLORS } from '../config/constants';

export type ProfileStackParamList = {
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
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
        name="BaristaProfile"
        component={BaristaProfileScreen}
        options={{ title: 'Profile', headerShown: false }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        component={BaristaProfileSetupScreen}
        options={{ title: 'Complete Your Profile' }}
      />
    </Stack.Navigator>
  );
};
