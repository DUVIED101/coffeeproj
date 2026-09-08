import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@bystrobarista/core/config/constants';
import { getCityLabel, type CityCode, type CityEntry } from '@bystrobarista/core/types/city';
import { listCitiesForPicker, searchCities } from '@bystrobarista/core/utils/cities';
import { MetroService } from '@bystrobarista/core/utils/metro';

type Section = { key: 'pinned' | 'all' | 'search'; data: CityEntry[] };

type CityRowProps = {
  city: CityEntry;
  label: string;
  selected: boolean;
  metroBadge: string;
  onPress: (code: CityCode) => void;
};

const CityRow = React.memo<CityRowProps>(({ city, label, selected, metroBadge, onPress }) => {
  const handlePress = useCallback(() => onPress(city.code), [city.code, onPress]);
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{label}</Text>
      {MetroService.hasMetro(city.code) && <Text style={styles.metroBadge}>{metroBadge}</Text>}
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
});
CityRow.displayName = 'CityRow';

type CityPickerModalProps = {
  visible: boolean;
  value: CityCode | undefined;
  onSelect: (city: CityCode | undefined) => void;
  onClose: () => void;
  /** Adds an "Any city" row that reports `undefined` — used by filter bars. */
  allowAny?: boolean;
};

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  visible,
  value,
  onSelect,
  onClose,
  allowAny,
}) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    if (query.trim()) return [{ key: 'search', data: searchCities(query) }];
    const { pinned, rest } = listCitiesForPicker();
    return [
      { key: 'pinned', data: [...pinned] },
      { key: 'all', data: [...rest] },
    ];
  }, [query]);

  const close = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (code: CityCode | undefined) => {
      onSelect(code);
      close();
    },
    [onSelect, close]
  );

  const renderItem = useCallback(
    ({ item }: { item: CityEntry }) => (
      <CityRow
        city={item}
        label={getCityLabel(item.code, i18n.language)}
        selected={item.code === value}
        metroBadge={t('city.metroBadge')}
        onPress={handleSelect}
      />
    ),
    [handleSelect, i18n.language, t, value]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      if (section.key === 'search') return null;
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>
            {section.key === 'pinned' ? t('city.pinnedSection') : t('city.allSection')}
          </Text>
        </View>
      );
    },
    [t]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.modalOverlay} onPress={close}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('city.placeholder')}</Text>
            <TouchableOpacity onPress={close} accessibilityRole="button">
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={t('city.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />

          <SectionList
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            initialNumToRender={20}
            ListHeaderComponent={
              allowAny && !query.trim() ? (
                <TouchableOpacity
                  style={[styles.row, value === undefined && styles.rowSelected]}
                  onPress={() => handleSelect(undefined)}
                  accessibilityRole="button">
                  <Text style={[styles.rowText, value === undefined && styles.rowTextSelected]}>
                    {t('city.anyOption')}
                  </Text>
                  {value === undefined && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('city.noResults')}</Text>
              </View>
            }
          />
        </View>
      </Pressable>
    </Modal>
  );
};

type CityPickerProps = {
  value: CityCode;
  onChange: (city: CityCode) => void;
  error?: string;
};

export const CityPicker: React.FC<CityPickerProps> = ({ value, onChange, error }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (city: CityCode | undefined) => {
      if (city && city !== value) onChange(city);
    },
    [onChange, value]
  );

  return (
    <View>
      <TouchableOpacity
        style={[styles.selector, error ? styles.selectorError : null]}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button">
        <Text style={styles.selectorText} numberOfLines={1}>
          {getCityLabel(value, i18n.language)}
        </Text>
        <Text style={styles.selectorChevron}>›</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <CityPickerModal
        visible={isOpen}
        value={value}
        onSelect={handleSelect}
        onClose={() => setIsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundSecondary,
  },
  selectorError: {
    borderColor: COLORS.error,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  selectorChevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowSelected: {
    backgroundColor: 'rgba(139, 69, 19, 0.06)',
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  rowTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  metroBadge: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    overflow: 'hidden',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
