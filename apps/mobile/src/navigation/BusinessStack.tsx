import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

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
  DisputeDetails: { applicationId?: string; disputeId?: string };
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
        getComponent={() => require('../screens/business/BusinessHomeScreen').BusinessHomeScreen}
        options={{ title: t('nav.businessHome') }}
      />
      <Stack.Screen
        name="CreateJob"
        getComponent={() => require('../screens/business/CreateJobScreen').CreateJobScreen}
        options={{ title: t('nav.createJob') }}
      />
      <Stack.Screen
        name="EditJob"
        getComponent={() => require('../screens/business/CreateJobScreen').CreateJobScreen}
        options={{ title: t('nav.editJob') }}
      />
      <Stack.Screen
        name="JobDetails"
        getComponent={() => require('../screens/business/JobDetailsScreen').JobDetailsScreen}
        options={{ title: t('nav.jobDetails') }}
      />
      <Stack.Screen
        name="Applicants"
        getComponent={() => require('../screens/business/ApplicantsScreen').ApplicantsScreen}
        options={{ title: t('nav.applicants') }}
      />
      <Stack.Screen
        name="ViewBaristaProfile"
        getComponent={() =>
          require('../screens/business/ViewBaristaProfileScreen').ViewBaristaProfileScreen
        }
        options={{ title: t('nav.viewBaristaProfile') }}
      />
      <Stack.Screen
        name="OfferJob"
        getComponent={() => require('../screens/business/OfferJobScreen').OfferJobScreen}
        options={{ title: t('nav.offerJob') }}
      />
      <Stack.Screen
        name="UserReviews"
        getComponent={() => require('../screens/shared/UserReviewsScreen').UserReviewsScreen}
        options={{ title: t('userReviews.title', { defaultValue: 'Все отзывы' }) }}
      />
      <Stack.Screen
        name="NotificationFeed"
        getComponent={() =>
          require('../screens/notifications/NotificationFeedScreen').NotificationFeedScreen
        }
        options={{ title: t('notifications.feed.title'), headerShown: false }}
      />
      <Stack.Screen
        name="ShiftAlert"
        getComponent={() => require('../screens/business/ShiftAlertScreen').ShiftAlertScreen}
        options={{ title: t('shifts.noResponseAlert.screenTitle') }}
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
