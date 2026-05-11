import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/constants';

type StarRowProps = {
  rating: number;
  size?: number;
  showValue?: boolean;
  count?: number;
};

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

export const StarRow = React.memo<StarRowProps>(({ rating, size = 16, showValue, count }) => {
  const rounded = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, i) => (i < rounded ? STAR_FILLED : STAR_EMPTY));

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${rating.toFixed(1)} из 5${count !== undefined ? `, ${count} отзывов` : ''}`}>
      <Text style={[styles.stars, { fontSize: size, lineHeight: size + 4 }]}>{stars.join('')}</Text>
      {showValue && rating > 0 && (
        <Text style={[styles.value, { fontSize: size - 2 }]}>{rating.toFixed(1)}</Text>
      )}
      {count !== undefined && count > 0 && (
        <Text style={[styles.count, { fontSize: size - 2 }]}>({count})</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    color: COLORS.warning,
  },
  value: {
    color: COLORS.text,
    fontWeight: '600',
  },
  count: {
    color: COLORS.textSecondary,
  },
});
