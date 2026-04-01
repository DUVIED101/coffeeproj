import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateBusinessScreen } from '../screens/business/CreateBusinessScreen';
import { BranchManagementScreen } from '../screens/business/BranchManagementScreen';
import { CreateJobScreen } from '../screens/business/CreateJobScreen';
import { ManageJobsScreen } from '../screens/business/ManageJobsScreen';
import { JobDetailsScreen } from '../screens/business/JobDetailsScreen';
import { BusinessService } from '../services/BusinessService';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../config/constants';
import type { Business } from '../types';

export type BusinessStackParamList = {
  CreateBusiness: undefined;
  BranchManagement: { businessId: string };
  CreateJob: undefined;
  ManageJobs: undefined;
  JobDetails: { jobId: string };
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export const BusinessStack: React.FC = () => {
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingBusiness();
  }, [user?.id]);

  const checkExistingBusiness = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const existingBusiness = await BusinessService.getBusinessByOwnerId(user.id);
      setBusiness(existingBusiness);
    } catch (error) {
      console.error('Error checking existing business:', error);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={business ? 'ManageJobs' : 'CreateBusiness'}
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="CreateBusiness"
        component={CreateBusinessScreen}
        options={{ title: 'Create Business' }}
      />
      <Stack.Screen
        name="BranchManagement"
        component={BranchManagementScreen}
        options={{ title: 'Branch Management' }}
        initialParams={business ? { businessId: business.id } : undefined}
      />
      <Stack.Screen
        name="ManageJobs"
        component={ManageJobsScreen}
        options={{ title: 'Manage Jobs' }}
      />
      <Stack.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{ title: 'Create Job' }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: 'Job Details' }}
      />
    </Stack.Navigator>
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
