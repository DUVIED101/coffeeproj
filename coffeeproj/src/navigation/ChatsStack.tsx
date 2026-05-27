import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ConversationsListScreen } from '../screens/chat/ConversationsListScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { COLORS } from '../config/constants';

export type ChatsStackParamList = {
  ConversationsList: undefined;
  Chat: { applicationId?: string; conversationId?: string };
  NotificationFeed: undefined;
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
        component={ConversationsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
