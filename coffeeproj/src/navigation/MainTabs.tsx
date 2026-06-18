import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useChatUnreadStore } from '../stores/chatUnreadStore';
import { ChatService } from '../services/ChatService';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Tab-scoped ErrorBoundary wrappers so a crash in one tab cannot tear down
// the whole tree (the root <NavigationContainer> would otherwise be unmounted).
// Defined at module scope so React keeps a stable component identity per tab.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrapWithBoundary = (Comp: React.ComponentType<any>): React.ComponentType<any> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapped: React.FC<any> = props => (
    <ErrorBoundary>
      <Comp {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `WithBoundary(${Comp.displayName ?? Comp.name ?? 'Component'})`;
  return Wrapped;
};

const ProfileStackBoundary = wrapWithBoundary(ProfileStack);
const BusinessProfileStackBoundary = wrapWithBoundary(BusinessProfileStack);
const BaristaStackPhoneBoundary = wrapWithBoundary(BaristaStack);
const BaristaStackTabletBoundary = wrapWithBoundary(BaristaStackTablet);
const ApplicationsStackPhoneBoundary = wrapWithBoundary(ApplicationsStack);
const ApplicationsStackTabletBoundary = wrapWithBoundary(ApplicationsStackTablet);
const BusinessStackBoundary = wrapWithBoundary(BusinessStack);
const BusinessSearchStackBoundary = wrapWithBoundary(BusinessSearchStack);
const ChatsStackPhoneBoundary = wrapWithBoundary(ChatsStack);
const ChatsStackTabletBoundary = wrapWithBoundary(ChatsStackTablet);
import { COLORS } from '../config/constants';
import { BusinessStack } from './BusinessStack';
import { BusinessProfileStack, type BusinessProfileStackParamList } from "./BusinessProfileStack";
import { BusinessSearchStack } from './BusinessSearchStack';
import { BaristaStack } from './BaristaStack';
import { BaristaStackTablet } from './BaristaStack.tablet';
import { ProfileStack } from './ProfileStack';
import { ChatsStack, type ChatsStackParamList } from "./ChatsStack";
import { ChatsStackTablet } from './ChatsStack.tablet';
import { ApplicationsStack } from './ApplicationsStack';
import { ApplicationsStackTablet } from './ApplicationsStack.tablet';
import { useIsTablet } from '../hooks/useResponsiveLayout';

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
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const { t } = useTranslation();
  const chatUnreadCount = useChatUnreadStore(s => s.unreadCount);
  const refreshChatUnread = useChatUnreadStore(s => s.refresh);
  const isTablet = useIsTablet();
  const BaristaStackBoundary = isTablet ? BaristaStackTabletBoundary : BaristaStackPhoneBoundary;
  const ApplicationsStackBoundary = isTablet
    ? ApplicationsStackTabletBoundary
    : ApplicationsStackPhoneBoundary;
  const ChatsStackBoundary = isTablet ? ChatsStackTabletBoundary : ChatsStackPhoneBoundary;

  useEffect(() => {
    if (!user?.id || !user.accountType) return;
    const userId = user.id;
    const accountType = user.accountType;
    refreshChatUnread(userId, accountType);
    const unsubscribe = ChatService.subscribeToUnreadChanges(userId, accountType, () => {
      refreshChatUnread(userId, accountType);
    });
    return unsubscribe;
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
        tabBarStyle: isTablet
          ? {
              borderTopColor: COLORS.border,
              maxWidth: 720,
              alignSelf: 'center',
              width: '100%',
            }
          : {
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
        component={
          user.accountType === 'barista' ? ProfileStackBoundary : BusinessProfileStackBoundary
        }
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
        component={BaristaStackBoundary}
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
        component={ApplicationsStackBoundary}
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
        component={BusinessStackBoundary}
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
        component={BusinessSearchStackBoundary}
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
        component={ChatsStackBoundary}
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
