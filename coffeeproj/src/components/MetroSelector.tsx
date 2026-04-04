import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { MetroService } from '../utils/metro';
import type { MetroStation } from '../utils/metro';
import { COLORS } from '../config/constants';

interface MetroSelectorProps {
  value?: string | string[]; // Support both single and multiple values
  onChange: (stationNames: string | string[]) => void;
  placeholder?: string;
  error?: string;
  multiSelect?: boolean; // Enable multi-select mode
}

export const MetroSelector: React.FC<MetroSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select metro station',
  error,
  multiSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedStations = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const filteredStations = useMemo(() => {
    const allStations = MetroService.getAllStations();
    console.log('[MetroSelector] Total stations available:', allStations.length);

    if (!searchQuery.trim()) {
      return allStations;
    }
    const results = MetroService.searchStations(searchQuery);
    console.log('[MetroSelector] Search results for', searchQuery, ':', results.length);
    return results;
  }, [searchQuery]);

  const handleSelectStation = (station: MetroStation) => {
    if (multiSelect) {
      // Multi-select mode: toggle selection
      const newSelection = selectedStations.includes(station.name)
        ? selectedStations.filter(s => s !== station.name)
        : [...selectedStations, station.name];
      onChange(newSelection);
      setSearchQuery(''); // Clear search to show all stations again
    } else {
      // Single-select mode: close modal after selection
      onChange(station.name);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleClear = () => {
    onChange(multiSelect ? [] : '');
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
    return `${selectedStations.length} станций`;
  };

  const renderStation = ({ item }: { item: MetroStation }) => {
    const isSelected = isStationSelected(item.name);
    return (
      <TouchableOpacity style={styles.stationItem} onPress={() => handleSelectStation(item)}>
        <View style={[styles.lineIndicator, { backgroundColor: item.lineColor }]} />
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{item.name}</Text>
          <Text style={styles.stationLine}>{item.line}</Text>
        </View>
        {multiSelect && isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
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
                {multiSelect ? 'Выберите станции метро' : 'Выберите станцию метро'}
              </Text>
              <TouchableOpacity onPress={handleDone}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Поиск станции..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList
              data={filteredStations}
              renderItem={renderStation}
              keyExtractor={item => item.id}
              style={styles.stationList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Станции не найдены</Text>
                </View>
              }
            />

            {multiSelect && (
              <View style={styles.doneButtonContainer}>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                  <Text style={styles.doneButtonText}>
                    Готово {selectedStations.length > 0 && `(${selectedStations.length})`}
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
    borderRadius: 20,
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
  searchInput: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
