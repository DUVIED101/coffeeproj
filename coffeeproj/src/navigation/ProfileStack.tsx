import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BaristaProfileScreen } from '../screens/barista/BaristaProfileScreen';
import { BaristaProfileSetupScreen } from '../screens/barista/BaristaProfileSetupScreen';
import { ShiftHistoryScreen } from '../screens/barista/ShiftHistoryScreen';
import { ApplicationDetailsScreen } from '../screens/barista/ApplicationDetailsScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { SettingsStack } from './SettingsStack';
import type { SettingsStackParamList } from './SettingsStack';
import { COLORS } from '../config/constants';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Application } from '../types/application';

export type ProfileStackParamList = {
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
  ShiftHistory: undefined;
  ApplicationDetails: { application: Application };
  UserReviews: { userId: string };
  NotificationFeed: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
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
      <Stack.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: 'История смен' }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ title: 'Application Details' }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: 'Все отзывы' }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};
