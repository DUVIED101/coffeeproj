import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADII } from '../config/constants';

type Props = {
  shiftStart: Date;
  jobTitle: string;
  onPress?: () => void;
};

const MS_PER_MINUTE = 60_000;

const formatRemaining = (
  ms: number,
  t: ReturnType<typeof useTranslation>['t']
): { label: string; urgent: boolean } => {
  if (ms <= 0) {
    return { label: t('shiftCountdown.started'), urgent: true };
  }
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  // Anything ≤ 3h is "soon" — banner switches to the urgent style so the
  // barista/business notices the prompt before the no-response alert fires.
  const urgent = ms <= 3 * 60 * MS_PER_MINUTE;
  if (days > 0) return { label: t('shiftCountdown.daysHours', { days, hours }), urgent };
  if (hours > 0) return { label: t('shiftCountdown.hoursMinutes', { hours, minutes }), urgent };
  return { label: t('shiftCountdown.minutes', { minutes }), urgent };
};

export const ShiftCountdownBanner: React.FC<Props> = ({ shiftStart, jobTitle, onPress }) => {
  const { t } = useTranslation();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS_PER_MINUTE);
    return () => clearInterval(id);
  }, []);

  const remainingMs = shiftStart.getTime() - now.getTime();
  // Hide once the shift's start is more than a day past — by then the banner is
  // noise. Within the 24h cushion after start we keep it visible so the actor
  // can still see the "shift began" hint.
  if (remainingMs < -24 * 60 * MS_PER_MINUTE) return null;

  const { label, urgent } = formatRemaining(remainingMs, t);
  const accent = urgent ? COLORS.background : COLORS.primary;

  const inner = (
    <>
      <MaterialCommunityIcons name="clock-time-five-outline" size={22} color={accent} />
      <View style={styles.text}>
        <Text style={[styles.title, urgent && styles.titleUrgent]} numberOfLines={1}>
          {jobTitle}
        </Text>
        <Text style={[styles.label, urgent && styles.labelUrgent]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={urgent ? COLORS.background : COLORS.textSecondary}
        />
      ) : null}
    </>
  );

  const style = [styles.banner, urgent ? styles.bannerUrgent : styles.bannerCalm];

  if (onPress) {
    return (
      <TouchableOpacity
        style={style}
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button">
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={style}>{inner}</View>;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADII.card,
    marginTop: 4,
    gap: 12,
  },
  bannerCalm: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerUrgent: {
    backgroundColor: COLORS.warning ?? '#F59E0B',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  titleUrgent: {
    color: COLORS.background,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  labelUrgent: {
    color: COLORS.background,
  },
});
