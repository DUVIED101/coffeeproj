import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JobFeedScreen } from '../screens/barista/JobFeedScreen';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
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
    </Stack.Navigator>
  );
};
