import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Job } from '../types/job';
import type { UserReviewAggregate } from '../types/review';
import { COLORS } from '../config/constants';
import { StarRow } from './StarRow';

interface JobCardProps {
  job: Job;
  onPress?: (jobId: string) => void;
  onLongPress?: (job: Job) => void;
  ownerAggregate?: UserReviewAggregate;
}

const formatCurrency = (amount: number, locale: string): string => {
  return `₽${amount.toLocaleString(locale)}`;
};

const formatShiftDate = (date: string, locale: string): string => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString(locale, { month: 'short' });
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

const getStatusText = (status: Job['status'], t: TFunction): string => {
  switch (status) {
    case 'open':
      return t('jobStatus.open');
    case 'in_review':
      return t('jobStatus.inReview');
    case 'filled':
      return t('jobStatus.filled');
    case 'expired':
      return t('jobStatus.expired');
    case 'cancelled':
      return t('jobStatus.cancelled');
    default:
      return status;
  }
};

const getCompensationText = (job: Job, t: TFunction, locale: string): string => {
  const formattedAmount = formatCurrency(job.compensation.amount, locale);
  switch (job.compensation.type) {
    case 'hourly':
      return t('compensation.hourly', { amount: formattedAmount });
    case 'daily':
      return t('compensation.daily', { amount: formattedAmount });
    case 'fixed':
      return formattedAmount;
    default:
      return formattedAmount;
  }
};

export const JobCard = React.memo<JobCardProps>(({ job, onPress, onLongPress, ownerAggregate }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const handlePress = useCallback(() => {
    if (onPress) onPress(job.id);
  }, [onPress, job.id]);
  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(job);
  }, [onLongPress, job]);

  const statusColor = getStatusColor(job.status);
  const statusText = getStatusText(job.status, t);
  const jobTypeText =
    job.jobType === 'temporary' ? t('filters.jobType.temporary') : t('filters.jobType.permanent');
  const compensationText = getCompensationText(job, t, locale);
  const shiftDate = formatShiftDate(job.shiftDetails.startDate, locale);
  const shiftTime = formatShiftTime(job.shiftDetails.startTime, job.shiftDetails.endTime);

  const visibleEquipment = job.requiredEquipmentExperience.slice(0, 3);
  const remainingEquipmentCount = job.requiredEquipmentExperience.length - 3;

  const hasUrgentTag = job.tags.includes('urgent');
  const branchThumbUri = job.branchPhotos?.[0];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.7}
      disabled={!onPress && !onLongPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.bodyLeft}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessText}>
              {job.businessName}
              {job.branchName && ` • ${job.branchName}`}
            </Text>
            {ownerAggregate && ownerAggregate.reviewCount > 0 && (
              <StarRow
                rating={ownerAggregate.averageRating}
                count={ownerAggregate.reviewCount}
                showValue
                size={12}
              />
            )}
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{jobTypeText}</Text>
            </View>
            {hasUrgentTag && (
              <View style={[styles.badge, styles.urgentBadge]}>
                <Text style={[styles.badgeText, styles.urgentText]}>{t('jobs.urgent')}</Text>
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

          {job.location?.address && (
            <Text style={styles.addressText} numberOfLines={2}>
              {job.location.address}
            </Text>
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
        </View>

        {branchThumbUri && (
          <Image source={{ uri: branchThumbUri }} style={styles.branchThumb} resizeMode="cover" />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.applicationCount}>
          {t('jobs.applicationsCount', { count: job.applicationCount ?? 0 })}
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
    borderRadius: 8,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bodyLeft: {
    flex: 1,
  },
  branchThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
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
    borderRadius: 8,
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
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
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
    borderRadius: 8,
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
