import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { ApplicationsStackParamList } from './ApplicationsStack';

const Stack = createNativeStackNavigator<ApplicationsStackParamList>();

export const ApplicationsStackTablet: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      initialRouteName="ApplicationsList"
      screenOptions={{ headerShown: true, headerBackTitleVisible: false }}>
      <Stack.Screen
        name="ApplicationsList"
        getComponent={() =>
          require('../screens/_tablet/ApplicationsTabletScreen').ApplicationsTabletScreen
        }
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
        name="JobDetails"
        getComponent={() => require('../screens/barista/JobDetailsScreen').JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="BusinessPublicProfile"
        getComponent={() =>
          require('../screens/barista/BusinessPublicProfileScreen').BusinessPublicProfileScreen
        }
        options={{ title: t('nav.businessPublicProfile') }}
      />
      <Stack.Screen
        name="DisputeDetails"
        getComponent={() => require('../screens/shared/DisputeDetailsScreen').DisputeDetailsScreen}
        options={{ title: t('disputes.detailsTitle') }}
      />
    </Stack.Navigator>
  );
};
