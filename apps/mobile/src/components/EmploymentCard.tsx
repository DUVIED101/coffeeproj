import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADII } from '@bystrobarista/core/config/constants';
import type { Employment, EmploymentStatus } from '@bystrobarista/core/types/employment';
import type { ApplicationId, JobId } from '@bystrobarista/core/types/ids';
import { Avatar } from './Avatar';
import { EmploymentStageActions } from './EmploymentStageActions';
import { employmentStageLine } from '../utils/employmentPresentation';

const STATUS_COLORS: Record<EmploymentStatus, string> = {
  pending_start: '#F59E0B',
  active: '#10B981',
  ending: COLORS.accent,
  ended: '#6B7280',
};

type EmploymentCardProps = {
  employment: Employment;
  isProcessing: boolean;
  onChat: (applicationId: ApplicationId) => void;
  onOpenApplicants: (jobId: JobId) => void;
  onConfirmStart: (applicationId: ApplicationId) => void;
  onRequestEnd: (applicationId: ApplicationId) => void;
  onConfirmEnd: (applicationId: ApplicationId) => void;
  onCancelEndRequest: (applicationId: ApplicationId) => void;
  onReopenJob: (jobId: JobId) => void;
};

export const EmploymentCard = React.memo<EmploymentCardProps>(
  ({
    employment,
    isProcessing,
    onChat,
    onOpenApplicants,
    onConfirmStart,
    onRequestEnd,
    onConfirmEnd,
    onCancelEndRequest,
    onReopenJob,
  }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const { applicationId, jobId, baristaProfile, job } = employment;

    const handleChat = useCallback(() => onChat(applicationId), [onChat, applicationId]);
    const handleOpenApplicants = useCallback(
      () => onOpenApplicants(jobId),
      [onOpenApplicants, jobId]
    );

    const baristaName = baristaProfile
      ? `${baristaProfile.firstName} ${baristaProfile.lastName}`.trim()
      : t('shifts.unknownBarista');
    const place = [job?.branchName, job?.metroStation].filter(Boolean).join(' · ');

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Avatar size={48} uri={baristaProfile?.avatarUrl} name={baristaName} />
          <View style={styles.headerText}>
            <Text style={styles.baristaName} numberOfLines={1}>
              {baristaName}
            </Text>
            {baristaProfile?.yearsOfExperience !== undefined && (
              <Text style={styles.experienceText}>
                {t('applicants.experienceYears', { count: baristaProfile.yearsOfExperience })}
              </Text>
            )}
          </View>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[employment.status] }]}>
            <Text style={styles.statusText}>{t(`employment.stageShort.${employment.status}`)}</Text>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {job?.title ?? ''}
        </Text>
        {place ? (
          <Text style={styles.place} numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        <Text style={styles.stageLine}>{employmentStageLine(employment, t, locale)}</Text>

        <View style={styles.linkRow}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleChat}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="message-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.linkText}>{t('applicants.chat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleOpenApplicants}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color={COLORS.primary} />
            <Text style={styles.linkText}>{t('employment.staff.openApplicants')}</Text>
          </TouchableOpacity>
        </View>

        <EmploymentStageActions
          employment={employment}
          side="business"
          isProcessing={isProcessing}
          canReopenJob={job?.status === 'filled'}
          onConfirmStart={onConfirmStart}
          onRequestEnd={onRequestEnd}
          onConfirmEnd={onConfirmEnd}
          onCancelEndRequest={onCancelEndRequest}
          onReopenJob={onReopenJob}
        />
      </View>
    );
  }
);

EmploymentCard.displayName = 'EmploymentCard';

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
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  baristaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  experienceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  place: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stageLine: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
