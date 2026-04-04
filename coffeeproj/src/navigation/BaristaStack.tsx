import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JobFeedScreen } from '../screens/barista/JobFeedScreen';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';
import { ApplyScreen } from '../screens/barista/ApplyScreen';
import { ApplicationsScreen } from '../screens/barista/ApplicationsScreen';
import type { Job } from '../types';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
};

const Stack = createNativeStackNavigator<BaristaStackParamList>();

export const BaristaStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="JobFeed"
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen name="JobFeed" component={JobFeedScreen} options={{ title: 'Find Jobs' }} />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen name="Apply" component={ApplyScreen} options={{ title: 'Apply for Job' }} />
      <Stack.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{ title: 'My Applications' }}
      />
    </Stack.Navigator>
  );
};
