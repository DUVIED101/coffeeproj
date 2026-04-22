import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import type { Application } from '../../types/application';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Applications: undefined;
  ApplicationDetails: { application: Application };
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'ApplicationDetails'>;
  route: RouteProp<BaristaStackParamList, 'ApplicationDetails'>;
};

export const ApplicationDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { application } = route.params;
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(application.status);
  const [completedByBarista, setCompletedByBarista] = useState(application.completedByBarista);
  const [completedByBusiness, setCompletedByBusiness] = useState(application.completedByBusiness);

  const job = application.job;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'accepted':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'pending':
      case 'under_review':
        return '#F59E0B';
      case 'withdrawn':
        return '#6B7280';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return status;
    }
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw this application? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsWithdrawing(true);
              await ApplicationService.withdrawApplication(application.id);
              setCurrentStatus('withdrawn');
              Alert.alert('Success', 'Application withdrawn successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error withdrawing application:', error);
              Alert.alert('Error', 'Failed to withdraw application. Please try again.');
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkComplete = async () => {
    try {
      setIsMarkingComplete(true);
      await ApplicationService.markCompletedByBarista(application.id);
      setCompletedByBarista(true);
      Alert.alert('Success', 'Work marked as completed');
    } catch (error) {
      console.error('Error marking work complete:', error);
      Alert.alert('Error', 'Failed to mark work as completed. Please try again.');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const canWithdraw = currentStatus === 'pending' || currentStatus === 'under_review';
  const canMarkComplete = currentStatus === 'accepted' && !completedByBarista;
  const showCompletionStatus = currentStatus === 'accepted' || currentStatus === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Application Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(currentStatus)}</Text>
          </View>
          <Text style={styles.appliedDate}>
            Applied: {new Date(application.createdAt).toLocaleDateString('ru-RU')}
          </Text>
        </View>

        {/* Job Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <Text style={styles.jobTitle}>{job?.title || 'Job'}</Text>
          <Text style={styles.businessName}>{job?.businessName || 'Business'}</Text>
          {job?.branchName && <Text style={styles.branchName}>{job.branchName}</Text>}
          {job?.metroStation && <Text style={styles.metroStation}>Metro: {job.metroStation}</Text>}
          {job?.compensation && (
            <Text style={styles.compensation}>
              {job.compensation.amount.toLocaleString('ru-RU')} ₽{' · '}
              {job.compensation.type === 'hourly'
                ? 'per hour'
                : job.compensation.type === 'daily'
                  ? 'per day'
                  : 'fixed'}
            </Text>
          )}
        </View>

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Cover Letter</Text>
            <Text style={styles.coverLetter}>{application.coverLetter}</Text>
          </View>
        )}

        {/* Work Completion Status */}
        {showCompletionStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Completion</Text>
            {completedByBarista && completedByBusiness && (
              <View style={styles.completionBanner}>
                <Text style={styles.completionText}>✅ Work completed</Text>
              </View>
            )}
            {completedByBarista && !completedByBusiness && (
              <View style={[styles.completionBanner, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.completionText, { color: '#92400E' }]}>
                  ✅ Work completed, waiting for business confirmation
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {(canWithdraw || canMarkComplete) && (
        <View style={styles.footer}>
          {canMarkComplete && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleMarkComplete}
              disabled={isMarkingComplete}>
              {isMarkingComplete ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>Mark Work as Completed</Text>
              )}
            </TouchableOpacity>
          )}
          {canWithdraw && (
            <TouchableOpacity
              style={[styles.withdrawButton, canMarkComplete && { marginTop: 12 }]}
              onPress={handleWithdraw}
              disabled={isWithdrawing}>
              {isWithdrawing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.withdrawButtonText}>Withdraw Application</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metroStation: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  compensation: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 12,
  },
  coverLetter: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  withdrawButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completionBanner: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
});
