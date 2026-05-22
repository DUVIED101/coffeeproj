import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MetroService } from '../utils/metro';
import type { MetroStation } from '../utils/metro';
import type { CityCode } from '../types/city';
import { CITY_CODES } from '../types/city';
import type { GeoPoint } from '../types/business';
import { COLORS } from '../config/constants';

const NEARBY_LIMIT = 5;

type StationRow = MetroStation & { distance?: number };

type CommonProps = {
  placeholder?: string;
  error?: string;
  city: CityCode;
  onCityChange: (city: CityCode) => void;
  userLocation?: GeoPoint;
};

type SingleMetroSelectorProps = CommonProps & {
  multiSelect?: false;
  value: string | null;
  onChange: (stationName: string | null) => void;
};

type MultiMetroSelectorProps = CommonProps & {
  multiSelect: true;
  value: string[];
  onChange: (stationNames: string[]) => void;
};

type MetroSelectorProps = SingleMetroSelectorProps | MultiMetroSelectorProps;

export const MetroSelector: React.FC<MetroSelectorProps> = props => {
  const { t } = useTranslation();
  const {
    placeholder = t('metro.placeholderSingle'),
    error,
    multiSelect,
    city,
    onCityChange,
    userLocation,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedStations = useMemo(() => {
    if (props.multiSelect) {
      return props.value;
    }
    return props.value ? [props.value] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value, props.multiSelect]);

  const nearbyStations = useMemo<StationRow[]>(() => {
    if (!userLocation || searchQuery.trim()) return [];
    return MetroService.getStationsByDistance(
      userLocation.latitude,
      userLocation.longitude,
      city,
      NEARBY_LIMIT
    );
  }, [userLocation, searchQuery, city]);

  const sections = useMemo<Array<{ key: 'nearby' | 'all'; data: StationRow[] }>>(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      return [{ key: 'all', data: MetroService.searchStations(trimmed, city) as StationRow[] }];
    }
    const nearbyIds = new Set(nearbyStations.map(s => s.id));
    const rest: StationRow[] = MetroService.getAllStations(city).filter(s => !nearbyIds.has(s.id));
    const result: Array<{ key: 'nearby' | 'all'; data: StationRow[] }> = [];
    if (nearbyStations.length > 0) {
      result.push({ key: 'nearby', data: nearbyStations });
    }
    result.push({ key: 'all', data: rest });
    return result;
  }, [searchQuery, city, nearbyStations]);

  const handleSelectStation = (station: MetroStation) => {
    if (props.multiSelect) {
      const newSelection = props.value.includes(station.name)
        ? props.value.filter(s => s !== station.name)
        : [...props.value, station.name];
      props.onChange(newSelection);
      setSearchQuery('');
    } else {
      props.onChange(station.name);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleCityTab = (nextCity: CityCode) => {
    if (nextCity === city) return;
    onCityChange(nextCity);
    setSearchQuery('');
  };

  const handleClear = () => {
    if (props.multiSelect) {
      props.onChange([]);
    } else {
      props.onChange(null);
    }
  };

  const handleDone = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const isStationSelected = (stationName: string): boolean => {
    return selectedStations.includes(stationName);
  };

  const getDisplayText = (): string => {
    if (selectedStations.length === 0) return placeholder;
    if (selectedStations.length === 1) return selectedStations[0];
    return t('metro.selectedCount', { count: selectedStations.length });
  };

  const renderStation = ({ item }: { item: StationRow }) => {
    const isSelected = isStationSelected(item.name);
    return (
      <TouchableOpacity style={styles.stationItem} onPress={() => handleSelectStation(item)}>
        <View style={[styles.lineIndicator, { backgroundColor: item.lineColor }]} />
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{item.name}</Text>
          <View style={styles.stationMetaRow}>
            <Text style={styles.stationLine}>{item.line}</Text>
            {typeof item.distance === 'number' && (
              <Text style={styles.stationDistance}>
                {MetroService.formatDistance(item.distance)}
              </Text>
            )}
          </View>
        </View>
        {multiSelect && isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const hasNearbySection = nearbyStations.length > 0 && !searchQuery.trim();

  const renderSectionHeader = ({
    section,
  }: {
    section: { key: 'nearby' | 'all'; data: StationRow[] };
  }) => {
    if (section.key === 'nearby') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>
            {t('metro.nearbySection', { defaultValue: 'Рядом с вами' })}
          </Text>
        </View>
      );
    }
    if (!hasNearbySection) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {t('metro.allSection', { defaultValue: 'Все станции' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selector, error ? styles.selectorError : null]}
        onPress={() => setIsOpen(true)}>
        <Text
          style={[styles.selectorText, selectedStations.length === 0 && styles.placeholder]}
          numberOfLines={1}>
          {getDisplayText()}
        </Text>
      </TouchableOpacity>

      {selectedStations.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>✕</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={handleDone}>
        <Pressable style={styles.modalOverlay} onPress={handleDone}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {multiSelect ? t('metro.titleMulti') : t('metro.titleSingle')}
              </Text>
              <TouchableOpacity onPress={handleDone}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cityTabs}>
              {CITY_CODES.map(code => {
                const active = code === city;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.cityTab, active && styles.cityTabActive]}
                    onPress={() => handleCityTab(code)}>
                    <Text style={[styles.cityTabText, active && styles.cityTabTextActive]}>
                      {t(`metro.cityTab.${code}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={t('metro.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <SectionList
              sections={sections}
              renderItem={renderStation}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={item => item.id}
              style={styles.stationList}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('metro.noResults')}</Text>
                </View>
              }
            />

            {multiSelect && (
              <View style={styles.doneButtonContainer}>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                  <Text style={styles.doneButtonText}>
                    {t('common.done')}{' '}
                    {selectedStations.length > 0 && `(${selectedStations.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  selector: {
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
    fontSize: 14,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textSecondary,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  cityTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 999,
    padding: 4,
  },
  cityTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  cityTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cityTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  cityTabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 16,
  },
  stationList: {
    flex: 1,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  stationLine: {
    fontSize: 14,
    color: '#666',
  },
  stationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationDistance: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  doneButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
