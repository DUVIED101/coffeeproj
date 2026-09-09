import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SettingsStack, type SettingsStackParamList } from './SettingsStack';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Application } from '@bystrobarista/core/types/application';

export type ProfileStackParamList = {
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
  ShiftHistory: undefined;
  ApplicationDetails: { application: Application } | { applicationId: string };
  UserReviews: { userId: string };
  NotificationFeed: undefined;
  DisputeDetails: { applicationId?: string; disputeId?: string };
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
        getComponent={() => require('../screens/barista/BaristaProfileScreen').BaristaProfileScreen}
        options={{ title: t('nav.tabs.profile'), headerShown: false }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        getComponent={() =>
          require('../screens/barista/BaristaProfileSetupScreen').BaristaProfileSetupScreen
        }
        options={{ title: t('nav.completeProfile') }}
      />
      <Stack.Screen
        name="ShiftHistory"
        getComponent={() => require('../screens/barista/ShiftHistoryScreen').ShiftHistoryScreen}
        options={{ title: t('nav.shiftHistory') }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        getComponent={() =>
          require('../screens/barista/ApplicationDetailsScreen').ApplicationDetailsScreen
        }
        options={{ title: t('nav.applicationDetails') }}
      />
      <Stack.Screen
        name="UserReviews"
        getComponent={() => require('../screens/shared/UserReviewsScreen').UserReviewsScreen}
        options={{ title: t('userReviews.title', { defaultValue: 'Все отзывы' }) }}
      />
      <Stack.Screen
        name="NotificationFeed"
        getComponent={() =>
          require('../screens/notifications/NotificationFeedScreen').NotificationFeedScreen
        }
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="DisputeDetails"
        getComponent={() => require('../screens/shared/DisputeDetailsScreen').DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle', { defaultValue: 'Жалоба' }) }}
      />
      <Stack.Screen name="Settings" component={SettingsStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};
