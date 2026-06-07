import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BusinessHomeScreen } from '../screens/business/BusinessHomeScreen';
import { CreateJobScreen } from '../screens/business/CreateJobScreen';
import { JobDetailsScreen } from '../screens/business/JobDetailsScreen';
import { ApplicantsScreen } from '../screens/business/ApplicantsScreen';
import { ViewBaristaProfileScreen } from '../screens/business/ViewBaristaProfileScreen';
import { OfferJobScreen } from '../screens/business/OfferJobScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { NotificationFeedScreen } from '../screens/notifications/NotificationFeedScreen';
import { ShiftAlertScreen } from '../screens/business/ShiftAlertScreen';
import { DisputeFormScreen } from '../screens/shared/DisputeFormScreen';

export type BusinessStackParamList = {
  BusinessHome: { businessId?: string };
  CreateJob: undefined;
  EditJob: { jobId: string };
  JobDetails: { jobId: string };
  Applicants: { jobId: string };
  ViewBaristaProfile: { baristaId: string };
  OfferJob: { baristaId: string };
  UserReviews: { userId: string };
  NotificationFeed: undefined;
  ShiftAlert: { applicationId: string; jobTitle: string; shiftStartIso: string };
  DisputeForm: { applicationId: string; role: 'barista' | 'business' };
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export const BusinessStack: React.FC = () => {
  const { t } = useTranslation();
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
        options={{ title: t('nav.businessHome') }}
      />
      <Stack.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{ title: t('nav.createJob') }}
      />
      <Stack.Screen
        name="EditJob"
        component={CreateJobScreen}
        options={{ title: t('nav.editJob') }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="Applicants"
        component={ApplicantsScreen}
        options={{ title: t('nav.applicants') }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        component={ViewBaristaProfileScreen}
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="OfferJob"
        component={OfferJobScreen}
        options={{ title: t('nav.offerJob') }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: t('userReviews.title', { defaultValue: 'Все отзывы' }) }}
      />
      <Stack.Screen
        name="NotificationFeed"
        component={NotificationFeedScreen}
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="ShiftAlert"
        component={ShiftAlertScreen}
        options={{ title: t('shifts.noResponseAlert.screenTitle') }}
      />
      <Stack.Screen
        name="DisputeForm"
        component={DisputeFormScreen}
        options={{ title: t('disputes.formTitle') }}
      />
    </Stack.Navigator>
  );
};
