import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { ApplicationService } from '../../services/ApplicationService';
import { ChatService } from '../../services/ChatService';
import { useAuthStore } from '../../stores/authStore';
import type { Application, ApplicationStatus } from '../../types/application';
import type { ConversationId } from '../../types/chat';

type BaristaStackParamList = {
  JobFeed: undefined;
  JobDetails: { jobId: string; distance?: number };
  Apply: { jobId: string };
  Applications: undefined;
  ApplicationDetails: { application: Application };
  Chat: { applicationId: string; conversationId?: ConversationId };
};

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'Applications'>;
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

const ApplicationItem = React.memo<{
  application: Application;
  onPress: (application: Application) => void;
  onChatPress: (applicationId: string) => void;
  unreadCount: number;
}>(({ application, onPress, onChatPress, unreadCount }) => {
  const statusColor = getStatusColor(application.status);
  const statusText = getStatusText(application.status);

  const handlePress = useCallback(() => onPress(application), [onPress, application]);
  const handleChatPress = useCallback(
    () => onChatPress(application.id),
    [onChatPress, application.id]
  );

  return (
    <TouchableOpacity style={styles.applicationCard} onPress={handlePress}>
      <View style={styles.applicationHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {application.job?.title || 'Job'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>
      <Text style={styles.businessName}>{application.job?.businessName || 'Business'}</Text>
      {application.job?.branchName && (
        <Text style={styles.branchName}>{application.job.branchName}</Text>
      )}
      {application.job?.compensation && (
        <Text style={styles.compensation}>
          {application.job.compensation.amount.toLocaleString('ru-RU')} ₽{' · '}
          {application.job.compensation.type === 'hourly'
            ? 'per hour'
            : application.job.compensation.type === 'daily'
              ? 'per day'
              : 'fixed'}
        </Text>
      )}
      <Text style={styles.appliedDate}>
        Applied: {new Date(application.createdAt).toLocaleDateString('ru-RU')}
      </Text>

      <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
        <Text style={styles.chatButtonText}>Message Business</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export const ApplicationsScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore(state => state.user);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadApplications = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await ApplicationService.getApplicationsByBarista(user.id);
      setApplications(data);

      const ids = data.map(a => a.id);
      try {
        const counts = await ChatService.getUnreadCountsByApplicationIds(ids, 'barista');
        setUnreadCounts(counts);
      } catch (err) {
        console.error('Error fetching unread counts:', err);
        setUnreadCounts({});
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadApplications();
  };

  const handleApplicationPress = useCallback(
    (application: Application) => {
      navigation.navigate('ApplicationDetails', { application });
    },
    [navigation]
  );

  const handleChatPress = useCallback(
    (applicationId: string) => {
      navigation.getParent()?.navigate('Chats', {
        screen: 'Chat',
        initial: false,
        params: { applicationId },
      });
    },
    [navigation]
  );

  const renderApplication = useCallback(
    ({ item }: { item: Application }) => (
      <ApplicationItem
        application={item}
        onPress={handleApplicationPress}
        onChatPress={handleChatPress}
        unreadCount={unreadCounts[item.id] || 0}
      />
    ),
    [handleApplicationPress, handleChatPress, unreadCounts]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No applications yet</Text>
      <Text style={styles.emptySubtext}>Start applying to jobs to see your applications here</Text>
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
        <Text style={styles.title}>My Applications</Text>
      </View>

      <FlatList
        data={applications}
        renderItem={renderApplication}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
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
  },
  listContent: {
    padding: 16,
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  businessName: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  compensation: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  appliedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
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
    borderRadius: 12,
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
});
