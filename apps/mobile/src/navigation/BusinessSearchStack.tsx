import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@bystrobarista/core/config/constants';

export type BusinessSearchStackParamList = {
  BaristaFeed: undefined;
  ViewBaristaProfile: { baristaId: string };
  OfferJob: { baristaId: string };
  UserReviews: { userId: string };
  NotificationFeed: undefined;
};

const Stack = createNativeStackNavigator<BusinessSearchStackParamList>();

export const BusinessSearchStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      initialRouteName="BaristaFeed"
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
      }}>
      <Stack.Screen
        name="BaristaFeed"
        getComponent={() => require('../screens/business/BaristaFeedScreen').BaristaFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        getComponent={() =>
          require('../screens/business/ViewBaristaProfileScreen').ViewBaristaProfileScreen
        }
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="OfferJob"
        getComponent={() => require('../screens/business/OfferJobScreen').OfferJobScreen}
        options={{ title: t('nav.offerJob') }}
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
    </Stack.Navigator>
  );
};
