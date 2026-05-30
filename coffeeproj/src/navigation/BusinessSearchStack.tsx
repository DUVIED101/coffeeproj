import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BaristaFeedScreen } from '../screens/business/BaristaFeedScreen';
import { ViewBaristaProfileScreen } from '../screens/business/ViewBaristaProfileScreen';
import { OfferJobScreen } from '../screens/business/OfferJobScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { COLORS } from '../config/constants';

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
        component={BaristaFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        component={ViewBaristaProfileScreen}
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="OfferJob"
        component={OfferJobScreen}
        options={{ title: t('nav.offerJob') }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: t('nav.userReviews') }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
