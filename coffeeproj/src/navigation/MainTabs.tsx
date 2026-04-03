import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../config/constants';
import { BusinessStack } from './BusinessStack';
import { BaristaStack } from './BaristaStack';

// Placeholder screens for now
const HomeScreen = () => {
  const { user, signOut } = useAuthStore();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Email: {user?.email}</Text>
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const ProfileScreen = () => {
  const { user } = useAuthStore();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account Type: {user?.accountType}</Text>
      <Text style={styles.subtitle}>Status: {user?.isVerified ? 'Verified' : 'Not Verified'}</Text>
    </View>
  );
};

export type MainTabsParamList = {
  Home: undefined;
  Jobs: undefined;
  Business: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const MainTabs: React.FC = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Tab.Navigator
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
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
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
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
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
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
