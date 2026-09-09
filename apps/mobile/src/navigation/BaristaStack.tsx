import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeaderWithActions } from '../components/ScreenHeaderWithActions';
import { useNotificationFeedStore } from '../stores/notificationFeedStore';
import type { Job } from '@bystrobarista/core/types';
import type { Application } from '@bystrobarista/core/types/application';

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
  DisputeDetails: { applicationId?: string; disputeId?: string };
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
        getComponent={() => require('../screens/barista/JobFeedScreen').JobFeedScreen}
        options={({ navigation }) => ({
          header: () => <JobFeedHeader navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="JobDetails"
        getComponent={() => require('../screens/barista/JobDetailsScreen').JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="Apply"
        getComponent={() => require('../screens/barista/ApplyScreen').ApplyScreen}
        options={{ title: t('nav.applyForJob') }}
      />
      <Stack.Screen
        name="Applications"
        getComponent={() => require('../screens/barista/ApplicationsScreen').ApplicationsScreen}
        options={{ title: t('nav.myApplications') }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        getComponent={() =>
          require('../screens/barista/ApplicationDetailsScreen').ApplicationDetailsScreen
        }
        options={{ title: t('nav.applicationDetails') }}
      />
      <Stack.Screen
        name="ShiftHistory"
        getComponent={() => require('../screens/barista/ShiftHistoryScreen').ShiftHistoryScreen}
        options={{ title: t('nav.shiftHistory') }}
      />
      <Stack.Screen
        name="BaristaProfile"
        getComponent={() => require('../screens/barista/BaristaProfileScreen').BaristaProfileScreen}
        options={{ title: t('nav.baristaProfile') }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        getComponent={() =>
          require('../screens/barista/BaristaProfileSetupScreen').BaristaProfileSetupScreen
        }
        options={{ title: t('nav.completeProfile') }}
      />
      <Stack.Screen
        name="NotificationFeed"
        getComponent={() =>
          require('../screens/notifications/NotificationFeedScreen').NotificationFeedScreen
        }
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="BusinessJobs"
        getComponent={() => require('../screens/barista/BusinessJobsScreen').BusinessJobsScreen}
        options={{ title: t('nav.businessJobs') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        getComponent={() =>
          require('../screens/barista/BusinessPublicProfileScreen').BusinessPublicProfileScreen
        }
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="JobOffer"
        getComponent={() => require('../screens/barista/JobOfferScreen').JobOfferScreen}
        options={{ title: t('nav.jobOffer') }}
      />
      <Stack.Screen
        name="DisputeForm"
        getComponent={() => require('../screens/shared/DisputeFormScreen').DisputeFormScreen}
        options={{ title: t('disputes.formTitle') }}
      />
      <Stack.Screen
        name="DisputeDetails"
        getComponent={() => require('../screens/shared/DisputeDetailsScreen').DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle') }}
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
          tutorialKey: 'header.bell',
        },
      ]}
    />
  );
};
