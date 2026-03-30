import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateBusinessScreen } from '../screens/business/CreateBusinessScreen';
import { BranchManagementScreen } from '../screens/business/BranchManagementScreen';

export type BusinessStackParamList = {
  CreateBusiness: undefined;
  BranchManagement: { businessId: string };
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export const BusinessStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="CreateBusiness"
        component={CreateBusinessScreen}
        options={{ title: 'Create Business' }}
      />
      <Stack.Screen
        name="BranchManagement"
        component={BranchManagementScreen}
        options={{ title: 'Branch Management' }}
      />
    </Stack.Navigator>
  );
};
