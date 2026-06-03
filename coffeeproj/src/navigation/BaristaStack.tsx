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
import { BusinessPublicProfileScreen } from '../screens/barista/BusinessPublicProfileScreen';
import { JobOfferScreen } from '../screens/barista/JobOfferScreen';
import { DisputeFormScreen } from '../screens/shared/DisputeFormScreen';
import { useNotificationFeedStore } from '../stores/notificationFeedStore';
import type { Job } from '../types';
import type { Application } from '../types/application';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
  ApplicationDetails: { application: Application } | { applicationId: string };
  ShiftHistory: undefined;
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
  NotificationFeed: undefined;
  BusinessJobs: { businessOwnerId: string; businessName?: string };
  BusinessPublicProfile: { businessOwnerId: string };
  JobOffer: { offerId: string };
  DisputeForm: { applicationId: string; role: 'barista' | 'business' };
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
          header: () => <JobFeedHeader navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="Apply"
        component={ApplyScreen}
        options={{ title: t('nav.applyForJob') }}
      />
      <Stack.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{ title: t('nav.myApplications') }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ title: t('nav.applicationDetails') }}
      />
      <Stack.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: t('nav.shiftHistory') }}
      />
      <Stack.Screen
        name="BaristaProfile"
        component={BaristaProfileScreen}
        options={{ title: t('nav.baristaProfile') }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        component={BaristaProfileSetupScreen}
        options={{ title: t('nav.completeProfile') }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessJobs"
        component={BusinessJobsScreen}
        options={{ title: t('nav.businessJobs') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        component={BusinessPublicProfileScreen}
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="JobOffer"
        component={JobOfferScreen}
        options={{ title: t('nav.jobOffer') }}
      />
      <Stack.Screen
        name="DisputeForm"
        component={DisputeFormScreen}
        options={{ title: t('disputes.formTitle') }}
      />
    </Stack.Navigator>
  );
};

const JobFeedHeader: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const unreadCount = useNotificationFeedStore(state => state.unreadCount);
  return (
    <ScreenHeaderWithActions
      title={t('nav.findJobs')}
      actions={[
        {
          icon: 'bell-outline',
          badgeCount: unreadCount,
          onPress: () => navigation.navigate('NotificationFeed'),
          testID: 'bell',
        },
      ]}
    />
  );
};
