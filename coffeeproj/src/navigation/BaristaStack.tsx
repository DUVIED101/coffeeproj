import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { JobFeedScreen } from '../screens/barista/JobFeedScreen';
import { ScreenHeaderWithActions } from '../components/ScreenHeaderWithActions';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';
import { ApplyScreen } from '../screens/barista/ApplyScreen';
import { ApplicationsScreen } from '../screens/barista/ApplicationsScreen';
import { ApplicationDetailsScreen } from '../screens/barista/ApplicationDetailsScreen';
import { ShiftHistoryScreen } from '../screens/barista/ShiftHistoryScreen';
import { BaristaProfileScreen } from '../screens/barista/BaristaProfileScreen';
import { BaristaProfileSetupScreen } from '../screens/barista/BaristaProfileSetupScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { BusinessJobsScreen } from '../screens/barista/BusinessJobsScreen';
import { useNotificationFeedStore } from '../stores/notificationFeedStore';
import type { Job } from '../types';
import type { Application } from '../types/application';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
  ApplicationDetails: { application: Application };
  ShiftHistory: undefined;
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
  NotificationFeed: undefined;
  BusinessJobs: { businessOwnerId: string; businessName?: string };
};

const Stack = createNativeStackNavigator<BaristaStackParamList>();

export const BaristaStack: React.FC = () => {
  const { t } = useTranslation();

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
          header: () => <JobFeedHeader navigation={navigation} t={t} />,
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
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: 'История смен' }}
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
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessJobs"
        component={BusinessJobsScreen}
        options={{ title: 'Jobs' }}
      />
    </Stack.Navigator>
  );
};

const JobFeedHeader: React.FC<{ navigation: any; t: (key: string) => string }> = ({
  navigation,
  t,
}) => {
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  return (
    <ScreenHeaderWithActions
      title="Find Jobs"
      actions={[
        {
          icon: 'bell-outline',
          badgeCount: unreadCount,
          onPress: () => navigation.navigate('NotificationFeed'),
          testID: 'bell',
        },
        { label: 'My Applications', onPress: () => navigation.navigate('Applications') },
      ]}
    />
  );
};
