import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@bystrobarista/core/config/constants';

export type ChatsStackParamList = {
  ConversationsList: undefined;
  Chat: { applicationId?: string; conversationId?: string };
  NotificationFeed: undefined;
  ViewBaristaProfile: { baristaId: string };
  BusinessPublicProfile: { businessOwnerId: string };
  BusinessJobs: { businessOwnerId: string; businessName?: string };
  UserReviews: { userId: string };
};

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export const ChatsStack: React.FC = () => {
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
        getComponent={() =>
          require('../screens/chat/ConversationsListScreen').ConversationsListScreen
        }
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        getComponent={() => require('../screens/chat/ChatScreen').ChatScreen}
        options={{ title: t('nav.chat') }}
      />
      <Stack.Screen
        name="NotificationFeed"
        getComponent={() =>
          require('../screens/notifications/NotificationFeedScreen').NotificationFeedScreen
        }
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        getComponent={() =>
          require('../screens/business/ViewBaristaProfileScreen').ViewBaristaProfileScreen
        }
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        getComponent={() =>
          require('../screens/barista/BusinessPublicProfileScreen').BusinessPublicProfileScreen
        }
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="BusinessJobs"
        getComponent={() => require('../screens/barista/BusinessJobsScreen').BusinessJobsScreen}
        options={{ title: t('nav.businessJobs') }}
      />
      <Stack.Screen
        name="UserReviews"
        getComponent={() => require('../screens/shared/UserReviewsScreen').UserReviewsScreen}
        options={{ title: t('nav.userReviews') }}
      />
    </Stack.Navigator>
  );
};
