import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SettingsStack, type SettingsStackParamList } from './SettingsStack';
import { COLORS } from '@bystrobarista/core/config/constants';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type BusinessProfileStackParamList = {
  BusinessProfileHome: undefined;
  BusinessProfileSetup: undefined;
  BranchManagement: { businessId: string };
  BusinessReviews: undefined;
  UserReviews: { userId: string };
  NotificationFeed: undefined;
  DisputeDetails: { applicationId?: string; disputeId?: string };
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Stack = createNativeStackNavigator<BusinessProfileStackParamList>();

export const BusinessProfileStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="BusinessProfileHome"
        getComponent={() =>
          require('../screens/business/BusinessProfileScreen').BusinessProfileScreen
        }
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessProfileSetup"
        getComponent={() =>
          require('../screens/business/BusinessProfileSetupScreen').BusinessProfileSetupScreen
        }
        options={{ title: t('nav.editBusinessProfile') }}
      />
      <Stack.Screen
        name="BranchManagement"
        getComponent={() =>
          require('../screens/business/BranchManagementScreen').BranchManagementScreen
        }
        options={{ title: t('nav.branches') }}
      />
      <Stack.Screen
        name="BusinessReviews"
        getComponent={() =>
          require('../screens/business/BusinessReviewsScreen').BusinessReviewsScreen
        }
        options={{ title: t('nav.businessReviews') }}
      />
      <Stack.Screen
        name="UserReviews"
        getComponent={() => require('../screens/shared/UserReviewsScreen').UserReviewsScreen}
        options={{ title: t('nav.userReviews') }}
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
