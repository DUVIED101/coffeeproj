import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BusinessProfileScreen } from '../screens/business/BusinessProfileScreen';
import { BusinessProfileSetupScreen } from '../screens/business/BusinessProfileSetupScreen';
import { BranchManagementScreen } from '../screens/business/BranchManagementScreen';
import { BusinessReviewsScreen } from '../screens/business/BusinessReviewsScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { DisputeDetailsScreen } from '../screens/shared/DisputeDetailsScreen';
import { SettingsStack } from './SettingsStack';
import type { SettingsStackParamList } from './SettingsStack';
import { COLORS } from '../config/constants';
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
        component={BusinessProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessProfileSetup"
        component={BusinessProfileSetupScreen}
        options={{ title: t('nav.editBusinessProfile') }}
      />
      <Stack.Screen
        name="BranchManagement"
        component={BranchManagementScreen}
        options={{ title: t('nav.branches') }}
      />
      <Stack.Screen
        name="BusinessReviews"
        component={BusinessReviewsScreen}
        options={{ title: t('nav.businessReviews') }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: t('nav.userReviews') }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="DisputeDetails"
        component={DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle', { defaultValue: 'Жалоба' }) }}
      />
      <Stack.Screen name="Settings" component={SettingsStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};
