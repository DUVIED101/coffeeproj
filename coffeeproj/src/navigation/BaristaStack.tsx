import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JobFeedScreen } from '../screens/barista/JobFeedScreen';
import { ScreenHeaderWithActions } from '../components/ScreenHeaderWithActions';
import { JobDetailsScreen } from '../screens/barista/JobDetailsScreen';
import { ApplyScreen } from '../screens/barista/ApplyScreen';
import { ApplicationsScreen } from '../screens/barista/ApplicationsScreen';
import { ApplicationDetailsScreen } from '../screens/barista/ApplicationDetailsScreen';
import { BaristaProfileScreen } from '../screens/barista/BaristaProfileScreen';
import { BaristaProfileSetupScreen } from '../screens/barista/BaristaProfileSetupScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ConversationsListScreen } from '../screens/chat/ConversationsListScreen';
import { BusinessJobsScreen } from '../screens/barista/BusinessJobsScreen';
import type { Job } from '../types';
import type { Application } from '../types/application';

export type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { job: Job };
  Applications: undefined;
  ApplicationDetails: { application: Application };
  BaristaProfile: undefined;
  BaristaProfileSetup: undefined;
  Chat: { applicationId?: string; conversationId?: string };
  ConversationsList: undefined;
  BusinessJobs: { businessOwnerId: string; businessName?: string };
};

const Stack = createNativeStackNavigator<BaristaStackParamList>();

export const BaristaStack: React.FC = () => {
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
          header: () => (
            <ScreenHeaderWithActions
              title="Find Jobs"
              actions={[
                { label: 'Chats', onPress: () => navigation.navigate('ConversationsList') },
                {
                  label: 'My Applications',
                  onPress: () => navigation.navigate('Applications'),
                },
              ]}
            />
          ),
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
        name="BaristaProfile"
        component={BaristaProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="BaristaProfileSetup"
        component={BaristaProfileSetupScreen}
        options={{ title: 'Complete Your Profile' }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{ title: 'Conversations' }}
      />
      <Stack.Screen
        name="BusinessJobs"
        component={BusinessJobsScreen}
        options={{ title: 'Jobs' }}
      />
    </Stack.Navigator>
  );
};
