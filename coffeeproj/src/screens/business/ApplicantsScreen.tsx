import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import type { Application, ApplicationStatus } from '../../types/application';

type BusinessStackParamList = {
  CreateBusiness: undefined;
  BusinessHome: { businessId: string };
  CreateJob: undefined;
  JobDetails: { jobId: string };
  Applicants: { jobId: string };
  ViewBaristaProfile: { baristaId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'Applicants'>;
  route: RouteProp<BusinessStackParamList, 'Applicants'>;
};

const getStatusColor = (status: ApplicationStatus): string => {
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

const getStatusText = (status: ApplicationStatus): string => {
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

interface ApplicantItemProps {
  application: Application;
  onAccept: () => void;
  onReject: () => void;
  onViewProfile: () => void;
  isProcessing: boolean;
}

const ApplicantItem = React.memo<ApplicantItemProps>(
  ({ application, onAccept, onReject, onViewProfile, isProcessing }) => {
    const baristaProfile = application.baristaProfile;
    const baristaEmail = application.baristaEmail || 'Unknown';
    const displayName = baristaProfile
      ? `${baristaProfile.firstName} ${baristaProfile.lastName}`
      : baristaEmail;

    const statusColor = getStatusColor(application.status);
    const statusText = getStatusText(application.status);
    const isActionable = application.status === 'pending' || application.status === 'under_review';

    return (
      <View style={styles.applicantCard}>
        <View style={styles.applicantHeader}>
          <View style={styles.applicantHeaderLeft}>
            {baristaProfile?.avatarUrl ? (
              <Image source={{ uri: baristaProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.applicantInfo}>
              <Text style={styles.baristaName}>{displayName}</Text>
              {baristaProfile && baristaProfile.yearsOfExperience !== undefined && (
                <Text style={styles.experienceText}>
                  {baristaProfile.yearsOfExperience} years experience
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {application.coverLetter && (
          <View style={styles.coverLetterContainer}>
            <Text style={styles.coverLetterLabel}>Cover Letter:</Text>
            <Text style={styles.coverLetterText}>{application.coverLetter}</Text>
          </View>
        )}

        <Text style={styles.appliedDate}>
          Applied: {new Date(application.createdAt).toLocaleDateString('ru-RU')}
        </Text>

        {baristaProfile && (
          <TouchableOpacity style={styles.viewProfileButton} onPress={onViewProfile}>
            <Text style={styles.viewProfileButtonText}>View Profile</Text>
          </TouchableOpacity>
        )}

        {isActionable && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);

export const ApplicantsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId } = route.params;

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  const loadApplicants = async () => {
    try {
      setIsLoading(true);
      const data = await ApplicationService.getApplicationsByJob(jobId);
      setApplications(data);
    } catch (error) {
      console.error('Error loading applicants:', error);
      Alert.alert('Error', 'Failed to load applicants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = useCallback(async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      await ApplicationService.updateApplicationStatus(applicationId, 'accepted');
      await loadApplicants();
      Alert.alert('Success', 'Application accepted');
    } catch (error) {
      console.error('Error accepting application:', error);
      Alert.alert('Error', 'Failed to accept application');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleReject = useCallback(async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      await ApplicationService.updateApplicationStatus(applicationId, 'rejected');
      await loadApplicants();
      Alert.alert('Success', 'Application rejected');
    } catch (error) {
      console.error('Error rejecting application:', error);
      Alert.alert('Error', 'Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleViewProfile = useCallback(
    (baristaId: string) => {
      navigation.navigate('ViewBaristaProfile', { baristaId });
    },
    [navigation]
  );

  const renderApplicant = useCallback(
    ({ item }: { item: Application }) => (
      <ApplicantItem
        application={item}
        onAccept={() => handleAccept(item.id)}
        onReject={() => handleReject(item.id)}
        onViewProfile={() => handleViewProfile(item.baristaId)}
        isProcessing={processingId === item.id}
      />
    ),
    [handleAccept, handleReject, handleViewProfile, processingId]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No applicants yet</Text>
      <Text style={styles.emptySubtext}>
        Applications will appear here when baristas apply to this job
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Applicants</Text>
        <Text style={styles.subtitle}>{applications.length} total</Text>
      </View>

      <FlatList
        data={applications}
        renderItem={renderApplicant}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  applicantCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  applicantInfo: {
    flex: 1,
  },
  baristaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  experienceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  coverLetterContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  coverLetterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  coverLetterText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  appliedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  viewProfileButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
