import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { StarRow } from './StarRow';
import type { ApplicationReview } from '../types/review';

type ReviewListRowProps = {
  review: ApplicationReview;
};

export const ReviewListRow = React.memo<ReviewListRowProps>(({ review }) => {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const date = new Date(review.createdAt).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <StarRow rating={review.rating} size={16} />
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={styles.comment}>{review.comment ? review.comment : '—'}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});
