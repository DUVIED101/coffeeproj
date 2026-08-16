import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { useReportSheet } from '../hooks/useReportSheet';
import { useAuthStore } from '../stores/authStore';
import type { ReportTargetType } from '../types';

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  variant?: 'inline' | 'icon';
};

export const ReportButton: React.FC<Props> = memo(
  ({ targetType, targetId, variant = 'inline' }) => {
    const { t } = useTranslation();
    const { open, sheet } = useReportSheet();
    const user = useAuthStore(s => s.user);

    if (user?.bannedAt) return null;
    if (user?.suspendedUntil && new Date(user.suspendedUntil).getTime() > Date.now()) {
      return null;
    }

    return (
      <>
        <TouchableOpacity
          onPress={() => open({ type: targetType, id: targetId })}
          style={variant === 'icon' ? styles.iconButton : styles.inlineButton}
          accessibilityRole="button"
          accessibilityLabel={t('report.buttonLabel')}>
          <Text style={variant === 'icon' ? styles.iconButtonText : styles.inlineButtonText}>
            {t('report.buttonLabel')}
          </Text>
        </TouchableOpacity>
        {sheet}
      </>
    );
  }
);

ReportButton.displayName = 'ReportButton';

const styles = StyleSheet.create({
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inlineButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
