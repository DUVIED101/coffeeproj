import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JobFeedScreen } from '../screens/barista/JobFeedScreen';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';
import { ApplyScreen } from '../screens/barista/ApplyScreen';
import { ApplicationsScreen } from '../screens/barista/ApplicationsScreen';
import { ApplicationDetailsScreen } from '../screens/barista/ApplicationDetailsScreen';
import { BaristaProfileScreen } from '../screens/barista/BaristaProfileScreen';
import { BaristaProfileSetupScreen } from '../screens/barista/BaristaProfileSetupScreen';
import { COLORS } from '../config/constants';
import type { Job } from '../types';
import type { Application } from '../types/application';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
  ApplicationDetails: { application: Application };
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
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
      <Stack.Screen
        name="JobFeed"
        component={JobFeedScreen}
        options={({ navigation }) => ({
          title: 'Find Jobs',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Applications')}>
              <Text style={styles.headerButtonText}>My Applications</Text>
            </TouchableOpacity>
          ),
        })}
      />
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
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ title: 'Application Details' }}
      />
      <Stack.Screen
        name="BaristaProfile"
        component={BaristaProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        component={BaristaProfileSetupScreen}
        options={{ title: 'Complete Your Profile' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
  },
  headerButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
