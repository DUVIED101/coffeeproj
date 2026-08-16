import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ChatsTabletScreen } from '../screens/_tablet/ChatsTabletScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { ViewBaristaProfileScreen } from '../screens/business/ViewBaristaProfileScreen';
import { BusinessPublicProfileScreen } from '../screens/barista/BusinessPublicProfileScreen';
import { BusinessJobsScreen } from '../screens/barista/BusinessJobsScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { COLORS } from '../config/constants';
import type { ChatsStackParamList } from './ChatsStack';

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export const ChatsStackTablet: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      initialRouteName="ConversationsList"
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
      }}>
      <Stack.Screen
        name="ConversationsList"
        component={ChatsTabletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        component={ViewBaristaProfileScreen}
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        component={BusinessPublicProfileScreen}
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="BusinessJobs"
        component={BusinessJobsScreen}
        options={{ title: t('nav.businessJobs') }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: t('nav.userReviews') }}
      />
    </Stack.Navigator>
  );
};
