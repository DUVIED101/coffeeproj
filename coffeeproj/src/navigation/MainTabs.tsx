import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useChatUnreadStore } from '../stores/chatUnreadStore';
import { COLORS } from '../config/constants';
import { BusinessStack } from './BusinessStack';
import { BusinessProfileStack } from './BusinessProfileStack';
import type { BusinessProfileStackParamList } from './BusinessProfileStack';
import { BusinessSearchStack } from './BusinessSearchStack';
import { BaristaStack } from './BaristaStack';
import { ProfileStack } from './ProfileStack';
import { ChatsStack } from './ChatsStack';
import { ApplicationsStack } from './ApplicationsStack';
import type { ChatsStackParamList } from './ChatsStack';

export type MainTabsParamList = {
  Profile: NavigatorScreenParams<BusinessProfileStackParamList> | undefined;
  Jobs: undefined;
  Applications: undefined;
  Business: undefined;
  Baristas: undefined;
  Chats: NavigatorScreenParams<ChatsStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const MainTabs: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const chatUnreadCount = useChatUnreadStore(s => s.unreadCount);
  const refreshChatUnread = useChatUnreadStore(s => s.refresh);

  useEffect(() => {
    if (!user?.id || !user.accountType) return;
    refreshChatUnread(user.id, user.accountType);
    const interval = setInterval(() => refreshChatUnread(user.id, user.accountType!), 30_000);
    return () => clearInterval(interval);
  }, [user?.id, user?.accountType, refreshChatUnread]);

  if (isLoading || !user) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopColor: COLORS.border,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
      }}>
      <Tab.Screen
        name="Profile"
        component={user.accountType === 'barista' ? ProfileStack : BusinessProfileStack}
        options={{
          title: t('nav.tabs.profile'),
          tabBarLabel: t('nav.tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-circle' : 'account-circle-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={BaristaStack}
        options={{
          title: t('nav.tabs.jobs'),
          tabBarLabel: t('nav.tabs.jobs'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'briefcase-search' : 'briefcase-search-outline'}
              color={color}
              size={size}
            />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBaristaUser = user?.accountType === 'barista';
            if (!isBaristaUser) return null;
            return <Pressable {...props} />;
          },
        }}
      />
      <Tab.Screen
        name="Applications"
        component={ApplicationsStack}
        options={{
          title: t('nav.tabs.applications', { defaultValue: 'Мои отклики' }),
          tabBarLabel: t('nav.tabs.applications', { defaultValue: 'Отклики' }),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'file-document' : 'file-document-outline'}
              color={color}
              size={size}
            />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBaristaUser = user?.accountType === 'barista';
            if (!isBaristaUser) return null;
            return <Pressable {...props} />;
          },
        }}
      />
      <Tab.Screen
        name="Business"
        component={BusinessStack}
        options={{
          title: t('nav.tabs.business'),
          tabBarLabel: t('nav.tabs.business'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'storefront' : 'storefront-outline'}
              color={color}
              size={size}
            />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBusinessUser = user?.accountType === 'business';
            if (!isBusinessUser) return null;
            return <Pressable {...props} />;
          },
        }}
      />
      <Tab.Screen
        name="Baristas"
        component={BusinessSearchStack}
        options={{
          title: t('nav.tabs.baristas'),
          tabBarLabel: t('nav.tabs.baristas'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'coffee' : 'coffee-outline'}
              color={color}
              size={size}
            />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBusinessUser = user?.accountType === 'business';
            if (!isBusinessUser) return null;
            return <Pressable {...props} />;
          },
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsStack}
        options={{
          title: t('chats.title'),
          tabBarLabel: t('chats.title'),
          headerShown: false,
          tabBarBadge: chatUnreadCount > 0 ? chatUnreadCount : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'chat' : 'chat-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
});
