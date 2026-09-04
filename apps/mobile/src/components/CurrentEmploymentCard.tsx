import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '@bystrobarista/core/config/constants';
import type { Employment } from '@bystrobarista/core/types/employment';
import type { ApplicationId } from '@bystrobarista/core/types/ids';
import { employmentStageLine } from '../utils/employmentPresentation';

type CurrentEmploymentCardProps = {
  employment: Employment;
  onOpen: (employment: Employment) => void;
  onChat: (applicationId: ApplicationId) => void;
};

export const CurrentEmploymentCard = React.memo<CurrentEmploymentCardProps>(
  ({ employment, onOpen, onChat }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const job = employment.job;
    const place = [job?.branchName, job?.metroStation].filter(Boolean).join(' · ');

    const handleOpen = useCallback(() => onOpen(employment), [onOpen, employment]);
    const handleChat = useCallback(
      () => onChat(employment.applicationId),
      [onChat, employment.applicationId]
    );

    return (
      <View style={styles.card}>
        <Text style={styles.overline}>{t('employment.currentJob')}</Text>
        <Text style={styles.businessName} numberOfLines={1}>
          {job?.businessName ?? t('applications.fallbackBusiness')}
        </Text>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job?.title ?? t('applications.fallbackJob')}
        </Text>
        {place ? (
          <Text style={styles.place} numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        <Text style={styles.stageLine}>{employmentStageLine(employment, t, locale)}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpen}
            accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{t('employment.openDetails')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleChat}
            accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{t('applications.messageBusiness')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

CurrentEmploymentCard.displayName = 'CurrentEmploymentCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  jobTitle: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 2,
  },
  place: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stageLine: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
