import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { flushPendingPushPayload, navigationRef } from './navigationRef';
import { ProfileBootstrapScreen } from '../screens/auth/ProfileBootstrapScreen';
import { COLORS } from '../config/constants';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app mount
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderRoot = () => {
    if (!isAuthenticated) {
      return <AuthStack key="unauthenticated" />;
    }
    if (!user) {
      return <ProfileBootstrapScreen key="bootstrap" />;
    }
    return <MainTabs key="authenticated" />;
  };

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingPushPayload}>
      <ErrorBoundary>{renderRoot()}</ErrorBoundary>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
