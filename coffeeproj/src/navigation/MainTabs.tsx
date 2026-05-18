import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../config/constants';
import { BusinessStack } from './BusinessStack';
import { BusinessSearchStack } from './BusinessSearchStack';
import { BaristaStack } from './BaristaStack';
import { ProfileStack } from './ProfileStack';
import { SettingsStack } from './SettingsStack';

const BusinessProfilePlaceholder = () => {
  const { user } = useAuthStore();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Business Profile</Text>
      <Text style={styles.subtitle}>Account Type: {user?.accountType}</Text>
      <Text style={styles.subtitle}>Status: {user?.isVerified ? 'Verified' : 'Not Verified'}</Text>
    </View>
  );
};

export type MainTabsParamList = {
  Settings: undefined;
  Jobs: undefined;
  Business: undefined;
  Baristas: undefined;
  Profile: undefined;
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
        name="Settings"
        component={SettingsStack}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
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
          // Hide this tab for non-barista users by rendering nothing
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBaristaUser = user?.accountType === 'barista';

            // If not barista user, don't render the tab button
            if (!isBaristaUser) {
              return null;
            }

            // Otherwise, render default Pressable button
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
          // Hide this tab for non-business users by rendering nothing
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBusinessUser = user?.accountType === 'business';

            // If not business user, don't render the tab button
            if (!isBusinessUser) {
              return null;
            }

            // Otherwise, render default Pressable button
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
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="coffee" color={color} size={size} />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => {
            const { user } = useAuthStore.getState();
            const isBusinessUser = user?.accountType === 'business';

            if (!isBusinessUser) {
              return null;
            }

            return <Pressable {...props} />;
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={user.accountType === 'barista' ? ProfileStack : BusinessProfilePlaceholder}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerShown: false,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
});
