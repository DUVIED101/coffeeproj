import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BusinessProfileScreen } from '../screens/business/BusinessProfileScreen';
import { BusinessProfileSetupScreen } from '../screens/business/BusinessProfileSetupScreen';
import { BranchManagementScreen } from '../screens/business/BranchManagementScreen';
import { BusinessReviewsScreen } from '../screens/business/BusinessReviewsScreen';
import { UserReviewsScreen } from '../screens/shared/UserReviewsScreen';
import { COLORS } from '../config/constants';

export type BusinessProfileStackParamList = {
  BusinessProfileHome: undefined;
  BusinessProfileSetup: undefined;
  BranchManagement: { businessId: string };
  BusinessReviews: undefined;
  UserReviews: { userId: string };
};

const Stack = createNativeStackNavigator<BusinessProfileStackParamList>();

export const BusinessProfileStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="BusinessProfileHome"
        component={BusinessProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BusinessProfileSetup"
        component={BusinessProfileSetupScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="BranchManagement"
        component={BranchManagementScreen}
        options={{ title: 'Branches' }}
      />
      <Stack.Screen
        name="BusinessReviews"
        component={BusinessReviewsScreen}
        options={{ title: 'Отзывы' }}
      />
      <Stack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{ title: 'Все отзывы' }}
      />
    </Stack.Navigator>
  );
};
