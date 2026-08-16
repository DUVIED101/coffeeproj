import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, EQUIPMENT_CATEGORIES } from '../config/constants';

type Props = {
  selected: ReadonlyArray<string>;
  onToggle: (brand: string) => void;
  disabled?: boolean;
};

export const EquipmentChips = React.memo<Props>(({ selected, onToggle, disabled }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(
    (brand: string) => () => {
      if (!disabled) onToggle(brand);
    },
    [onToggle, disabled]
  );

  return (
    <View>
      {EQUIPMENT_CATEGORIES.map(category => (
        <View key={category.key} style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>
            {t(`equipmentCategories.${category.key}`, { defaultValue: category.key })}
          </Text>
          <View style={styles.chipsRow}>
            {category.brands.map(brand => {
              const isSelected = selected.includes(brand);
              return (
                <TouchableOpacity
                  key={brand}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={handlePress(brand)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: !!disabled }}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
});
EquipmentChips.displayName = 'EquipmentChips';

type DisplayProps = {
  selected: ReadonlyArray<string>;
};

/**
 * Read-only variant: renders only the picked brands, grouped under the same
 * "Кофемашины / Кофемолки" headings as the editor so the display view stays
 * visually consistent with the edit form.
 */
export const EquipmentChipsDisplay = React.memo<DisplayProps>(({ selected }) => {
  const { t } = useTranslation();
  const categorized = EQUIPMENT_CATEGORIES.map(category => ({
    key: category.key,
    brands: category.brands.filter(b => selected.includes(b)),
  })).filter(c => c.brands.length > 0);

  // Brands the user picked that don't match any known category (e.g. dropped
  // from the curated list later). Keep them visible under a generic header so
  // legacy data doesn't silently disappear.
  const known = new Set<string>(EQUIPMENT_CATEGORIES.flatMap(c => c.brands));
  const other = selected.filter(b => !known.has(b));

  if (categorized.length === 0 && other.length === 0) return null;

  return (
    <View>
      {categorized.map(category => (
        <View key={category.key} style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>
            {t(`equipmentCategories.${category.key}`, { defaultValue: category.key })}
          </Text>
          <View style={styles.chipsRow}>
            {category.brands.map(brand => (
              <View key={brand} style={[styles.chip, styles.chipSelected]}>
                <Text style={[styles.chipText, styles.chipTextSelected]}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {other.length > 0 && (
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>
            {t('equipmentCategories.other', { defaultValue: 'Другое' })}
          </Text>
          <View style={styles.chipsRow}>
            {other.map(brand => (
              <View key={brand} style={[styles.chip, styles.chipSelected]}>
                <Text style={[styles.chipText, styles.chipTextSelected]}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});
EquipmentChipsDisplay.displayName = 'EquipmentChipsDisplay';

const styles = StyleSheet.create({
  categoryBlock: {
    marginTop: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
