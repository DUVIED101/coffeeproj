import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTranslation } from 'react-i18next';
import { transformedImageUrl } from '../utils/imageTransform';
import type { TFunction } from 'i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADII } from '../config/constants';
import type { Application, ShiftLifecycleStatus } from '../types/application';
import type { Job } from '../types/job';
import { isCityCode } from '../types/city';

type ShiftCardProps = {
  job: Job;
  applications: Application[];
  lifecycle: ShiftLifecycleStatus;
  onPressApplicants: (jobId: string) => void;
  onPressAcceptedChat: (application: Application) => void;
};

const getStatusColor = (status: ShiftLifecycleStatus): string => {
  switch (status) {
    case 'open':
      return COLORS.success;
    case 'under_review':
      return COLORS.warning;
    case 'accepted':
      return COLORS.primary;
    case 'in_progress':
      return COLORS.accent;
    case 'completed':
      return COLORS.textSecondary;
  }
};

const getStatusLabel = (status: ShiftLifecycleStatus, t: TFunction): string => {
  return t(`shifts.status.${status}`);
};

const formatShiftDate = (date: string, locale: string): string => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString(locale, { month: 'short' });
  return `${day} ${month}`;
};

const getInitials = (firstName?: string, lastName?: string): string => {
  return `${firstName?.[0] ?? '?'}${lastName?.[0] ?? ''}`.toUpperCase();
};

const MAX_VISIBLE_AVATARS = 3;

export const ShiftCard = React.memo<ShiftCardProps>(
  ({ job, applications, lifecycle, onPressApplicants, onPressAcceptedChat }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const acceptedApp = useMemo(
      () => applications.find(a => a.status === 'accepted' || a.status === 'completed'),
      [applications]
    );

    const pendingApps = useMemo(
      () => applications.filter(a => a.status === 'pending' || a.status === 'under_review'),
      [applications]
    );

    const handleCardPress = useCallback(() => {
      onPressApplicants(job.id);
    }, [job.id, onPressApplicants]);

    const handleChatPress = useCallback(() => {
      if (acceptedApp) onPressAcceptedChat(acceptedApp);
    }, [acceptedApp, onPressAcceptedChat]);

    const shiftDate = formatShiftDate(job.shiftDetails.startDate, locale);
    const shiftSubtitle =
      job.shiftDetails.kind === 'permanent'
        ? t('jobDetails.hoursPerWeekShort', { hours: job.shiftDetails.hoursPerWeek })
        : `${job.shiftDetails.startTime}–${job.shiftDetails.endTime}`;
    const cityLabel = isCityCode(job.location.city)
      ? t(`city.codes.${job.location.city}`)
      : job.location.city;
    const metroOrBranch = job.metroStation || job.branchName || cityLabel;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={handleCardPress}
        accessibilityRole="button">
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {job.title}
            </Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>{shiftDate}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{shiftSubtitle}</Text>
            </View>
            {metroOrBranch ? (
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="subway" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {metroOrBranch}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(lifecycle) }]}>
            <Text style={styles.statusText}>{getStatusLabel(lifecycle, t)}</Text>
          </View>
        </View>

        {acceptedApp ? (
          <View style={styles.acceptedRow}>
            {acceptedApp.baristaProfile?.avatarUrl ? (
              <FastImage
                source={{
                  uri: transformedImageUrl(acceptedApp.baristaProfile.avatarUrl, AVATAR_SIZE),
                }}
                style={styles.acceptedAvatar}
              />
            ) : (
              <View style={[styles.acceptedAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>
                  {getInitials(
                    acceptedApp.baristaProfile?.firstName,
                    acceptedApp.baristaProfile?.lastName
                  )}
                </Text>
              </View>
            )}
            <View style={styles.acceptedTextWrap}>
              <Text style={styles.acceptedName} numberOfLines={1}>
                {acceptedApp.baristaProfile
                  ? `${acceptedApp.baristaProfile.firstName} ${acceptedApp.baristaProfile.lastName}`
                  : t('shifts.unknownBarista')}
              </Text>
              <Text style={styles.acceptedSubtext}>{t('shifts.acceptedBarista')}</Text>
            </View>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleChatPress}
              accessibilityRole="button"
              accessibilityLabel={t('shifts.openChat')}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={20}
                color={COLORS.background}
              />
              <Text style={styles.chatButtonText}>{t('shifts.chat')}</Text>
            </TouchableOpacity>
          </View>
        ) : pendingApps.length > 0 ? (
          <View style={styles.pendingRow}>
            <View style={styles.pendingAvatars}>
              {pendingApps.slice(0, MAX_VISIBLE_AVATARS).map((app, idx) => (
                <View
                  key={app.id}
                  style={[
                    styles.pendingAvatarWrap,
                    { marginLeft: idx === 0 ? 0 : -10, zIndex: MAX_VISIBLE_AVATARS - idx },
                  ]}>
                  {app.baristaProfile?.avatarUrl ? (
                    <FastImage
                      source={{
                        uri: transformedImageUrl(app.baristaProfile.avatarUrl, PENDING_AVATAR_SIZE),
                      }}
                      style={styles.pendingAvatar}
                    />
                  ) : (
                    <View style={[styles.pendingAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitialsSmall}>
                        {getInitials(app.baristaProfile?.firstName, app.baristaProfile?.lastName)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {pendingApps.length > MAX_VISIBLE_AVATARS ? (
                <View style={[styles.pendingAvatarWrap, { marginLeft: -10 }]}>
                  <View style={[styles.pendingAvatar, styles.avatarMore]}>
                    <Text style={styles.avatarMoreText}>
                      +{pendingApps.length - MAX_VISIBLE_AVATARS}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            <Text style={styles.pendingText}>
              {t('shifts.pendingCount', { count: pendingApps.length })}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyApplicantsRow}>
            <Text style={styles.emptyApplicantsText}>{t('shifts.noApplicantsYet')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

ShiftCard.displayName = 'ShiftCard';

const AVATAR_SIZE = 44;
const PENDING_AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaDot: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.background,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  acceptedAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  acceptedTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  acceptedName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  acceptedSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.pill,
  },
  chatButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  pendingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingAvatarWrap: {
    borderWidth: 2,
    borderColor: COLORS.background,
    borderRadius: PENDING_AVATAR_SIZE / 2 + 2,
  },
  pendingAvatar: {
    width: PENDING_AVATAR_SIZE,
    height: PENDING_AVATAR_SIZE,
    borderRadius: PENDING_AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  avatarInitialsSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  avatarMore: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.background,
  },
  pendingText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyApplicantsRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  emptyApplicantsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
