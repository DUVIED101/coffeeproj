import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { StarRow } from './StarRow';
import { BranchPhotoGallery } from './BranchPhotoGallery';
import type { Job } from '../types/job';
import type { UserReviewAggregate } from '../types/review';

type Props = {
  job: Job;
  ownerAggregate?: UserReviewAggregate | null;
  businessReliability?: { disputes30d: number; reliabilityScore: number } | null;
  distance?: number | null;
  onPhotoPress?: (index: number) => void;
};

const formatRecurringDays = (days: string[], locale: 'ru-RU' | 'en-US'): string => {
  const dayMap: Record<string, string> =
    locale === 'ru-RU'
      ? {
          monday: 'Пн',
          tuesday: 'Вт',
          wednesday: 'Ср',
          thursday: 'Чт',
          friday: 'Пт',
          saturday: 'Сб',
          sunday: 'Вс',
        }
      : {
          monday: 'Mon',
          tuesday: 'Tue',
          wednesday: 'Wed',
          thursday: 'Thu',
          friday: 'Fri',
          saturday: 'Sat',
          sunday: 'Sun',
        };
  return days.map(day => dayMap[day] || day).join(', ');
};

export const JobDetailsContent: React.FC<Props> = ({
  job,
  ownerAggregate,
  businessReliability,
  distance,
  onPhotoPress,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const formatDistance = (meters: number | null | undefined): string => {
    if (!meters) return '';
    if (meters < 1000) {
      return t('jobDetails.metersAway', {
        m: Math.round(meters),
        defaultValue: '{{m}} м',
      });
    }
    return t('jobDetails.kilometersAway', {
      km: (meters / 1000).toFixed(1),
      defaultValue: '{{km}} км',
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{job.businessName}</Text>
          {job.branchName && <Text style={styles.branchName}>{job.branchName}</Text>}
          {ownerAggregate && ownerAggregate.reviewCount > 0 && (
            <StarRow
              rating={ownerAggregate.averageRating}
              count={ownerAggregate.reviewCount}
              showValue
              size={13}
            />
          )}
          {businessReliability && (
            <Text style={styles.reliabilityText}>
              {t('reliability.sectionTitle')}: {businessReliability.reliabilityScore.toFixed(1)}/5
              {businessReliability.disputes30d > 0
                ? ` · ${t('reliability.incidents', { count: businessReliability.disputes30d })}`
                : ''}
            </Text>
          )}
        </View>
      </View>

      {job.branchPhotos && job.branchPhotos.length > 0 && (
        <View style={styles.section}>
          <BranchPhotoGallery photos={job.branchPhotos} onPhotoPress={onPhotoPress} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('jobDetails.location', { defaultValue: 'Расположение' })}
        </Text>
        <Text style={styles.address}>{job.location.address}</Text>
        {job.metroStation && (
          <View style={styles.metroContainer}>
            <Text style={styles.metroLabel}>
              {t('jobDetails.metroLabel', { defaultValue: 'Метро:' })}
            </Text>
            <Text style={styles.metroStation}>{job.metroStation}</Text>
          </View>
        )}
        {distance != null && (
          <Text style={styles.distance}>
            {t('jobDetails.distanceFromYou', {
              distance: formatDistance(distance),
              defaultValue: '{{distance}} от вас',
            })}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('jobDetails.shiftDetails', { defaultValue: 'Детали смены' })}
        </Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('jobDetails.date', { defaultValue: 'Дата:' })}</Text>
          <Text style={styles.detailValue}>{formatDate(job.shiftDetails.startDate)}</Text>
        </View>
        {job.shiftDetails.endDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('jobDetails.endDate', { defaultValue: 'Дата окончания:' })}
            </Text>
            <Text style={styles.detailValue}>{formatDate(job.shiftDetails.endDate)}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('jobDetails.time', { defaultValue: 'Время:' })}</Text>
          <Text style={styles.detailValue}>
            {job.shiftDetails.startTime} - {job.shiftDetails.endTime}
          </Text>
        </View>
        {job.shiftDetails.isRecurring && job.shiftDetails.recurringDays && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('jobDetails.recurring', { defaultValue: 'Повторяется:' })}
            </Text>
            <Text style={styles.detailValue}>
              {formatRecurringDays(job.shiftDetails.recurringDays, locale)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('jobDetails.compensation', { defaultValue: 'Оплата' })}
        </Text>
        <Text style={styles.compensationAmount}>
          {job.compensation.amount.toLocaleString(locale)} ₽
        </Text>
        <Text style={styles.compensationType}>
          {job.compensation.type === 'hourly'
            ? t('jobDetails.perHour', { defaultValue: 'за час' })
            : job.compensation.type === 'daily'
              ? t('jobDetails.perDay', { defaultValue: 'за день' })
              : t('jobDetails.fixed', { defaultValue: 'фиксированная оплата' })}
        </Text>
      </View>

      {job.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('jobDetails.description', { defaultValue: 'Описание' })}
          </Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>
      )}

      {job.requirements && job.requirements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('jobDetails.requirements', { defaultValue: 'Требования' })}
          </Text>
          {job.requirements.map((req, index) => (
            <Text key={index} style={styles.bulletItem}>
              • {req}
            </Text>
          ))}
        </View>
      )}

      {job.requiredEquipmentExperience && job.requiredEquipmentExperience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('jobDetails.requiredEquipment', {
              defaultValue: 'Требуемый опыт работы с оборудованием',
            })}
          </Text>
          {job.requiredEquipmentExperience.map((equipment, index) => (
            <Text key={index} style={styles.bulletItem}>
              • {equipment}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('jobDetails.jobType', { defaultValue: 'Тип занятости:' })}
          </Text>
          <Text style={styles.detailValue}>
            {job.jobType === 'temporary'
              ? t('jobDetails.jobTypeTemporary', { defaultValue: 'Временная' })
              : t('jobDetails.jobTypePermanent', { defaultValue: 'Постоянная' })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('jobDetails.applications', { defaultValue: 'Откликов:' })}
          </Text>
          <Text style={styles.detailValue}>{job.applicationCount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('jobDetails.posted', { defaultValue: 'Опубликовано:' })}
          </Text>
          <Text style={styles.detailValue}>{formatDate(job.postedAt)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  businessInfo: {
    gap: 4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  branchName: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  reliabilityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  address: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  metroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metroLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  metroStation: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  compensationAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  compensationType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  bulletItem: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 24,
  },
});
