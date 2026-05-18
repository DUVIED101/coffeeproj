import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../config/constants';
import { BusinessStack } from './BusinessStack';
import { BusinessProfileStack } from './BusinessProfileStack';
import type { BusinessProfileStackParamList } from './BusinessProfileStack';
import { BusinessSearchStack } from './BusinessSearchStack';
import { BaristaStack } from './BaristaStack';
import { ProfileStack } from './ProfileStack';
import { SettingsStack } from './SettingsStack';

export type MainTabsParamList = {
  Settings: undefined;
  Jobs: undefined;
  Business: undefined;
  Baristas: undefined;
  Profile: NavigatorScreenParams<BusinessProfileStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const MainTabs: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  const { t } = useTranslation();

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
          title: 'Profile',
          tabBarLabel: 'Profile',
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
          title: 'Jobs',
          tabBarLabel: 'Jobs',
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
        name="Business"
        component={BusinessStack}
        options={{
          title: 'Business',
          tabBarLabel: 'Business',
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
          title: 'Baristas',
          tabBarLabel: 'Baristas',
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
        name="Settings"
        component={SettingsStack}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.title'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cog' : 'cog-outline'}
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
