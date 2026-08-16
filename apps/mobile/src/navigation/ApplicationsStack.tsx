import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ApplicationsScreen } from '../screens/barista/ApplicationsScreen';
import { ApplicationDetailsScreen } from '../screens/barista/ApplicationDetailsScreen';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';
import { BusinessPublicProfileScreen } from '../screens/barista/BusinessPublicProfileScreen';
import { DisputeDetailsScreen } from '../screens/shared/DisputeDetailsScreen';
import type { Application } from '../types/application';

export type ApplicationsStackParamList = {
  ApplicationsList: undefined;
  ApplicationDetails: { application: Application } | { applicationId: string };
  JobDetails: { jobId: string; distance?: number };
  BusinessPublicProfile: { businessOwnerId: string };
  DisputeDetails: { applicationId?: string; disputeId?: string };
};

const Stack = createNativeStackNavigator<ApplicationsStackParamList>();

export const ApplicationsStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      initialRouteName="ApplicationsList"
      screenOptions={{ headerShown: true, headerBackTitleVisible: false }}>
      <Stack.Screen
        name="ApplicationsList"
        component={ApplicationsScreen}
        options={{ title: t('nav.myApplications') }}
      />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ title: t('nav.applicationDetails') }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        component={BusinessPublicProfileScreen}
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="DisputeDetails"
        component={DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle') }}
      />
    </Stack.Navigator>
  );
};
