import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';

type BusinessStackParamList = {
  CreateJob: undefined;
  ManageJobs: undefined;
  JobDetails: { jobId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'JobDetails'>;
  route: RouteProp<BusinessStackParamList, 'JobDetails'>;
};

export const JobDetailsScreen: React.FC<Props> = ({ route }) => {
  const { jobId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Job Details</Text>
        <Text style={styles.subtitle}>Job ID: {jobId}</Text>
        <Text style={styles.placeholder}>This screen will be implemented in a future phase</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
