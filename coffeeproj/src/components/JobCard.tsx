import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Job } from '../types/job';
import { COLORS } from '../config/constants';

interface JobCardProps {
  job: Job;
  onPress?: (jobId: string) => void;
}

const formatCurrency = (amount: number): string => {
  return `₽${amount.toLocaleString('ru-RU')}`;
};

const formatShiftDate = (date: string): string => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('ru-RU', { month: 'short' });
  return `${day} ${month}`;
};

const formatShiftTime = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

const getStatusColor = (status: Job['status']): string => {
  switch (status) {
    case 'open':
      return COLORS.success;
    case 'in_review':
      return COLORS.warning;
    case 'filled':
      return COLORS.textSecondary;
    case 'expired':
      return COLORS.error;
    case 'cancelled':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

const getStatusText = (status: Job['status']): string => {
  switch (status) {
    case 'open':
      return 'Открыто';
    case 'in_review':
      return 'На рассмотрении';
    case 'filled':
      return 'Заполнено';
    case 'expired':
      return 'Истекло';
    case 'cancelled':
      return 'Отменено';
    default:
      return status;
  }
};

const getJobTypeText = (jobType: Job['jobType']): string => {
  return jobType === 'temporary' ? 'Временная' : 'Постоянная';
};

const getCompensationText = (job: Job): string => {
  const formattedAmount = formatCurrency(job.compensation.amount);
  switch (job.compensation.type) {
    case 'hourly':
      return `${formattedAmount}/час`;
    case 'daily':
      return `${formattedAmount}/день`;
    case 'fixed':
      return formattedAmount;
    default:
      return formattedAmount;
  }
};

export const JobCard = React.memo<JobCardProps>(({ job, onPress }) => {
  const handlePress = useCallback(() => {
    if (onPress) onPress(job.id);
  }, [onPress, job.id]);

  const statusColor = getStatusColor(job.status);
  const statusText = getStatusText(job.status);
  const jobTypeText = getJobTypeText(job.jobType);
  const compensationText = getCompensationText(job);
  const shiftDate = formatShiftDate(job.shiftDetails.startDate);
  const shiftTime = formatShiftTime(job.shiftDetails.startTime, job.shiftDetails.endTime);

  const visibleEquipment = job.requiredEquipmentExperience.slice(0, 3);
  const remainingEquipmentCount = job.requiredEquipmentExperience.length - 3;

  const hasUrgentTag = job.tags.includes('urgent');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.businessInfo}>
        <Text style={styles.businessText}>
          {job.businessName}
          {job.branchName && ` • ${job.branchName}`}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{jobTypeText}</Text>
        </View>
        {hasUrgentTag && (
          <View style={[styles.badge, styles.urgentBadge]}>
            <Text style={[styles.badgeText, styles.urgentText]}>Срочно</Text>
          </View>
        )}
      </View>

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftText}>
          {shiftDate} • {shiftTime}
        </Text>
      </View>

      <View style={styles.compensationRow}>
        <Text style={styles.compensationText}>{compensationText}</Text>
      </View>

      {job.metroStation && (
        <View style={styles.metroRow}>
          <Text style={styles.metroIcon}>Ⓜ</Text>
          <Text style={styles.metroText}>{job.metroStation}</Text>
        </View>
      )}

      {job.requiredEquipmentExperience.length > 0 && (
        <View style={styles.equipmentRow}>
          {visibleEquipment.map((equipment, index) => (
            <View key={index} style={styles.equipmentChip}>
              <Text style={styles.equipmentText}>{equipment}</Text>
            </View>
          ))}
          {remainingEquipmentCount > 0 && (
            <View style={styles.equipmentChip}>
              <Text style={styles.equipmentText}>+{remainingEquipmentCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.applicationCount}>
          {job.applicationCount} {job.applicationCount === 1 ? 'заявка' : 'заявок'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
  },
  businessInfo: {
    marginBottom: 12,
  },
  businessText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
  },
  urgentText: {
    color: COLORS.background,
  },
  shiftInfo: {
    marginBottom: 8,
  },
  shiftText: {
    fontSize: 14,
    color: COLORS.text,
  },
  compensationRow: {
    marginBottom: 8,
  },
  compensationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  metroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metroIcon: {
    fontSize: 16,
    marginRight: 4,
    color: COLORS.primary,
  },
  metroText: {
    fontSize: 14,
    color: COLORS.text,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  equipmentChip: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  equipmentText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 8,
  },
  applicationCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
