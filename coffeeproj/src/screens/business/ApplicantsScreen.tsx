import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { ChatService } from '../../services/ChatService';
import { useAuthStore } from '../../stores/authStore';
import type { Application, ApplicationStatus } from '../../types/application';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';

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
  applicationId: string;
  baristaId: string;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onViewProfile: (baristaId: string) => void;
  onChatPress: (applicationId: string) => void;
  onConfirmCompletion: (applicationId: string) => void;
  isProcessing: boolean;
  unreadCount: number;
}

const ApplicantItem = React.memo<ApplicantItemProps>(
  ({
    application,
    applicationId,
    baristaId,
    onAccept,
    onReject,
    onViewProfile,
    onChatPress,
    onConfirmCompletion,
    isProcessing,
    unreadCount,
  }) => {
    const handleAccept = useCallback(() => onAccept(applicationId), [onAccept, applicationId]);
    const handleReject = useCallback(() => onReject(applicationId), [onReject, applicationId]);
    const handleViewProfile = useCallback(
      () => onViewProfile(baristaId),
      [onViewProfile, baristaId]
    );
    const handleChatPress = useCallback(
      () => onChatPress(applicationId),
      [onChatPress, applicationId]
    );
    const handleConfirmCompletion = useCallback(
      () => onConfirmCompletion(applicationId),
      [onConfirmCompletion, applicationId]
    );
    const baristaProfile = application.baristaProfile;
    const baristaEmail = application.baristaEmail || 'No email';

    // Get display name - prefer firstName+lastName if both exist and are non-empty
    let displayName = baristaEmail;
    if (baristaProfile?.firstName?.trim() && baristaProfile?.lastName?.trim()) {
      displayName = `${baristaProfile.firstName.trim()} ${baristaProfile.lastName.trim()}`;
    } else if (baristaProfile?.firstName?.trim()) {
      displayName = baristaProfile.firstName.trim();
    } else if (baristaProfile?.lastName?.trim()) {
      displayName = baristaProfile.lastName.trim();
    }

    const statusColor = getStatusColor(application.status);
    const statusText = getStatusText(application.status);
    const isActionable = application.status === 'pending' || application.status === 'under_review';
    const canConfirmCompletion =
      application.status === 'accepted' && !application.completedByBusiness;

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

        <TouchableOpacity style={styles.viewProfileButton} onPress={handleViewProfile}>
          <Text style={styles.viewProfileButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>💬 Chat</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {canConfirmCompletion && (
          <TouchableOpacity
            style={styles.confirmCompletionButton}
            onPress={handleConfirmCompletion}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmCompletionButtonText}>Confirm Completion</Text>
            )}
          </TouchableOpacity>
        )}

        {isActionable && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
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
  const user = useAuthStore(s => s.user);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const markProcessing = useCallback((id: string, on: boolean) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const loadApplicants = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ApplicationService.getApplicationsByJob(jobId);
      setApplications(data);

      const ids = data.map(a => a.id);
      try {
        const counts = await ChatService.getUnreadCountsByApplicationIds(ids, 'business');
        setUnreadCounts(counts);
      } catch (err) {
        console.error('Error fetching unread counts:', err);
        setUnreadCounts({});
      }
    } catch (error) {
      console.error('Error loading applicants:', error);
      Alert.alert('Error', 'Failed to load applicants');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      loadApplicants();
    }, [loadApplicants])
  );

  const handleAccept = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.updateApplicationStatus(applicationId, 'accepted', user.id);
        await loadApplicants();
        Alert.alert('Success', 'Application accepted');
      } catch (error) {
        console.error('Error accepting application:', error);
        Alert.alert('Error', 'Failed to accept application');
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants]
  );

  const handleReject = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.updateApplicationStatus(applicationId, 'rejected', user.id);
        await loadApplicants();
        Alert.alert('Success', 'Application rejected');
      } catch (error) {
        console.error('Error rejecting application:', error);
        Alert.alert('Error', 'Failed to reject application');
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants]
  );

  const handleViewProfile = useCallback(
    (baristaId: string) => {
      navigation.navigate('ViewBaristaProfile', { baristaId });
    },
    [navigation]
  );

  const handleChatPress = useCallback(
    (applicationId: string) => {
      navigation.navigate('Chat', { applicationId });
    },
    [navigation]
  );

  const handleConfirmCompletion = useCallback(
    async (applicationId: string) => {
      if (!user) return;
      try {
        markProcessing(applicationId, true);
        await ApplicationService.markCompletedByBusiness(applicationId, user.id);
        await loadApplicants();
        Alert.alert('Success', 'Work completion confirmed');
      } catch (error) {
        console.error('Error confirming completion:', error);
        Alert.alert('Error', 'Failed to confirm completion');
      } finally {
        markProcessing(applicationId, false);
      }
    },
    [user, markProcessing, loadApplicants]
  );

  const renderApplicant = useCallback(
    ({ item }: { item: Application }) => (
      <ApplicantItem
        application={item}
        applicationId={item.id}
        baristaId={item.baristaId}
        onAccept={handleAccept}
        onReject={handleReject}
        onViewProfile={handleViewProfile}
        onChatPress={handleChatPress}
        onConfirmCompletion={handleConfirmCompletion}
        isProcessing={processingIds.has(item.id)}
        unreadCount={unreadCounts[item.id] || 0}
      />
    ),
    [
      handleAccept,
      handleReject,
      handleViewProfile,
      handleChatPress,
      handleConfirmCompletion,
      processingIds,
      unreadCounts,
    ]
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
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  unreadBadge: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmCompletionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmCompletionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
