import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { BaristaProfile } from '../types/baristaProfile';
import { COLORS } from '../config/constants';
import { getInitials } from '../utils/getInitials';

type BaristaCardProps = {
  profile: BaristaProfile;
  onPress?: (userId: string) => void;
};

const getExperienceText = (years: number): string => {
  const suffix = years === 1 ? 'год' : years >= 2 && years <= 4 ? 'года' : 'лет';
  return `${years} ${suffix} опыта`;
};

const formatRate = (amount: number): string => `₽${amount.toLocaleString('ru-RU')}`;

const getHourlyRateText = (min?: number, max?: number): string | undefined => {
  if (min !== undefined && max !== undefined) {
    return `${formatRate(min)}–${formatRate(max)}/час`;
  }
  if (max !== undefined) {
    return `до ${formatRate(max)}/час`;
  }
  return undefined;
};

export const BaristaCard = React.memo<BaristaCardProps>(({ profile, onPress }) => {
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
  const hourlyRateText = getHourlyRateText(hourlyRateMin, hourlyRateMax);
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
        </View>
      </View>

      {yearsOfExperience !== undefined && (
        <View style={styles.experienceRow}>
          <Text style={styles.experienceText}>{getExperienceText(yearsOfExperience)}</Text>
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
        <Text style={styles.completenessLabel}>Заполнено на {clampedCompleteness}%</Text>
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
