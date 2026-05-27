import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
        name="BaristaProfile"
        component={BaristaProfileScreen}
        options={{ title: t('nav.tabs.profile'), headerShown: false }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        component={BaristaProfileSetupScreen}
        options={{ title: t('nav.completeProfile') }}
      />
      <Stack.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: t('nav.shiftHistory') }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ title: t('nav.applicationDetails') }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: t('userReviews.title', { defaultValue: 'Все отзывы' }) }}
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
