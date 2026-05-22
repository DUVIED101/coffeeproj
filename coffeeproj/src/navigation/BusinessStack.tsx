import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BusinessHomeScreen } from '../screens/business/BusinessHomeScreen';
import { CreateJobScreen } from '../screens/business/CreateJobScreen';
import { JobDetailsScreen } from '../screens/business/JobDetailsScreen';
import { ApplicantsScreen } from '../screens/business/ApplicantsScreen';
import { ViewBaristaProfileScreen } from '../screens/business/ViewBaristaProfileScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';

export type BusinessStackParamList = {
  BusinessHome: { businessId?: string };
  CreateJob: undefined;
  JobDetails: { jobId: string };
  Applicants: { jobId: string };
  ViewBaristaProfile: { baristaId: string };
  UserReviews: { userId: string };
  NotificationFeed: undefined;
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export const BusinessStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="BusinessHome"
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="BusinessHome"
        component={BusinessHomeScreen}
        options={{ title: 'My Business' }}
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
      <Stack.Screen
        name="Applicants"
        component={ApplicantsScreen}
        options={{ title: 'Applicants' }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        component={ViewBaristaProfileScreen}
        options={{ title: 'Barista Profile' }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: 'Все отзывы' }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
