import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BaristaFeedScreen } from '../screens/business/BaristaFeedScreen';
import { ViewBaristaProfileScreen } from '../screens/business/ViewBaristaProfileScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { COLORS } from '../config/constants';

export type BusinessSearchStackParamList = {
  BaristaFeed: undefined;
  ViewBaristaProfile: { baristaId: string };
  Chat: { applicationId?: string; conversationId?: string };
};

const Stack = createNativeStackNavigator<BusinessSearchStackParamList>();

export const BusinessSearchStack: React.FC = () => {
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
        options={{ title: 'Поиск баристы' }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        component={ViewBaristaProfileScreen}
        options={{ title: 'Профиль' }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
    </Stack.Navigator>
  );
};
