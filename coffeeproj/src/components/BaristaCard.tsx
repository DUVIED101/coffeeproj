import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { BaristaProfile } from '../types/baristaProfile';
import type { UserReviewAggregate } from '../types/review';
import { COLORS } from '../config/constants';
import { getInitials } from '../utils/getInitials';
import { StarRow } from './StarRow';

type BaristaCardProps = {
  profile: BaristaProfile;
  onPress?: (userId: string) => void;
  reviewAggregate?: UserReviewAggregate;
};

const formatRate = (amount: number, locale: string): string => `₽${amount.toLocaleString(locale)}`;

const getHourlyRateText = (
  min: number | null | undefined,
  max: number | null | undefined,
  t: TFunction,
  locale: string
): string | undefined => {
  if (min != null && max != null) {
    return t('barista.hourlyRange', {
      min: formatRate(min, locale),
      max: formatRate(max, locale),
    });
  }
  if (max != null) {
    return t('barista.hourlyMax', { max: formatRate(max, locale) });
  }
  return undefined;
};

export const BaristaCard = React.memo<BaristaCardProps>(({ profile, onPress, reviewAggregate }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const {
    userId,
    firstName,
    lastName,
    city,
    avatarUrl,
    yearsOfExperience,
    equipmentExperience,
    hourlyRateMin,
    hourlyRateMax,
    profileCompleteness,
  } = profile;

  const visibleEquipment = equipmentExperience.slice(0, 3);
  const remainingEquipmentCount = equipmentExperience.length - 3;
  const hourlyRateText = getHourlyRateText(hourlyRateMin, hourlyRateMax, t, locale);
  const clampedCompleteness = Math.max(0, Math.min(100, profileCompleteness));

  const handlePress = useCallback(() => {
    if (onPress) onPress(userId);
  }, [onPress, userId]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}>
      <View style={styles.headerRow}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{getInitials(firstName, lastName)}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.subtitle}>{city}</Text>
          <View style={styles.ratingRow}>
            {reviewAggregate && reviewAggregate.reviewCount > 0 ? (
              <StarRow
                rating={reviewAggregate.averageRating}
                count={reviewAggregate.reviewCount}
                showValue
                size={13}
              />
            ) : (
              <Text style={styles.noRating}>{t('reviews.noRatingsShort')}</Text>
            )}
          </View>
        </View>
      </View>

      {yearsOfExperience !== undefined && (
        <View style={styles.experienceRow}>
          <Text style={styles.experienceText}>
            {t('barista.experienceYears', { count: yearsOfExperience })}
          </Text>
        </View>
      )}

      {equipmentExperience.length > 0 && (
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

      {hourlyRateText && (
        <View style={styles.rateRow}>
          <Text style={styles.rateText}>{hourlyRateText}</Text>
        </View>
      )}

      <View style={styles.completenessContainer}>
        <View style={styles.completenessTrack}>
          <View style={[styles.completenessFill, { width: `${clampedCompleteness}%` }]} />
        </View>
        <Text style={styles.completenessLabel}>
          {t('barista.profileCompleteness', { percent: clampedCompleteness })}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ratingRow: {
    marginTop: 6,
  },
  noRating: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  experienceRow: {
    marginBottom: 8,
  },
  experienceText: {
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
  rateRow: {
    marginBottom: 8,
  },
  rateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  completenessContainer: {
    marginTop: 4,
  },
  completenessTrack: {
    height: 4,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  completenessFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  completenessLabel: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
