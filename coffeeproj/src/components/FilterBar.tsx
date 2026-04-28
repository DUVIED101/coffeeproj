import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import type { JobFilters, JobType } from '../types/job';
import type { Equipment, GeoPoint } from '../types/business';
import { COLORS } from '../config/constants';
import { MetroSelector } from './MetroSelector';

interface FilterBarProps {
  onFilterChange: (filters: JobFilters) => void;
  currentFilters: JobFilters;
  userLocation?: GeoPoint;
}

const EQUIPMENT_OPTIONS: Equipment[] = [
  'La Marzocco',
  'Victoria Arduino',
  'Nuova Simonelli',
  'Synesso',
  'Slayer',
];

const DISTANCE_OPTIONS = [
  { value: 5000, label: '5 км' },
  { value: 10000, label: '10 км' },
  { value: 25000, label: '25 км' },
  { value: 50000, label: '50 км' },
];

export const FilterBar = React.memo<FilterBarProps>(
  ({ onFilterChange, currentFilters, userLocation }) => {
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [showDistanceModal, setShowDistanceModal] = useState(false);

    const handleJobTypeChange = useCallback(
      (jobType?: JobType) => {
        onFilterChange({
          ...currentFilters,
          jobType,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleEquipmentToggle = useCallback(
      (equipment: string) => {
        const currentEquipment = currentFilters.equipment || [];
        const newEquipment = currentEquipment.includes(equipment)
          ? currentEquipment.filter(e => e !== equipment)
          : [...currentEquipment, equipment];

        onFilterChange({
          ...currentFilters,
          equipment: newEquipment.length > 0 ? newEquipment : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleMetroChange = useCallback(
      (stationNames: string[]) => {
        onFilterChange({
          ...currentFilters,
          metroStations: stationNames.length > 0 ? stationNames : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleDistanceChange = useCallback(
      (distance?: number) => {
        onFilterChange({
          ...currentFilters,
          maxDistance: distance,
        });
        setShowDistanceModal(false);
      },
      [currentFilters, onFilterChange]
    );

    const handleClearEquipment = useCallback(() => {
      onFilterChange({
        ...currentFilters,
        equipment: undefined,
      });
      setShowEquipmentModal(false);
    }, [currentFilters, onFilterChange]);

    const getJobTypeLabel = (type?: JobType): string => {
      if (!type) return 'Все';
      return type === 'temporary' ? 'Временная' : 'Постоянная';
    };

    const getDistanceLabel = (distance?: number): string => {
      if (!distance) return 'Расстояние';
      const km = distance / 1000;
      return `${km} км`;
    };

    const selectedEquipmentCount = currentFilters.equipment?.length || 0;

    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={[styles.filterChip, !currentFilters.jobType && styles.filterChipActive]}
            onPress={() => handleJobTypeChange(undefined)}>
            <Text
              style={[
                styles.filterChipText,
                !currentFilters.jobType && styles.filterChipTextActive,
              ]}>
              Все
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              currentFilters.jobType === 'temporary' && styles.filterChipActive,
            ]}
            onPress={() => handleJobTypeChange('temporary')}>
            <Text
              style={[
                styles.filterChipText,
                currentFilters.jobType === 'temporary' && styles.filterChipTextActive,
              ]}>
              Временная
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              currentFilters.jobType === 'permanent' && styles.filterChipActive,
            ]}
            onPress={() => handleJobTypeChange('permanent')}>
            <Text
              style={[
                styles.filterChipText,
                currentFilters.jobType === 'permanent' && styles.filterChipTextActive,
              ]}>
              Постоянная
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedEquipmentCount > 0 && styles.filterChipActive]}
            onPress={() => setShowEquipmentModal(true)}>
            <Text
              style={[
                styles.filterChipText,
                selectedEquipmentCount > 0 && styles.filterChipTextActive,
              ]}>
              Оборудование
              {selectedEquipmentCount > 0 && ` (${selectedEquipmentCount})`}
            </Text>
          </TouchableOpacity>

          <View style={styles.metroSelectorContainer}>
            <MetroSelector
              multiSelect
              value={currentFilters.metroStations ?? []}
              onChange={handleMetroChange}
              placeholder="Метро"
            />
          </View>

          {userLocation && (
            <TouchableOpacity
              style={[
                styles.filterChip,
                currentFilters.maxDistance ? styles.filterChipActive : null,
              ]}
              onPress={() => setShowDistanceModal(true)}>
              <Text
                style={[
                  styles.filterChipText,
                  currentFilters.maxDistance ? styles.filterChipTextActive : null,
                ]}>
                {getDistanceLabel(currentFilters.maxDistance)}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal
          visible={showEquipmentModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowEquipmentModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowEquipmentModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите оборудование</Text>
                <TouchableOpacity onPress={() => setShowEquipmentModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.equipmentList}>
                {EQUIPMENT_OPTIONS.map(equipment => {
                  const isSelected = currentFilters.equipment?.includes(equipment) || false;
                  return (
                    <TouchableOpacity
                      key={equipment}
                      style={[styles.equipmentItem, isSelected && styles.equipmentItemSelected]}
                      onPress={() => handleEquipmentToggle(equipment)}>
                      <Text
                        style={[
                          styles.equipmentItemText,
                          isSelected && styles.equipmentItemTextSelected,
                        ]}>
                        {equipment}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtonsRow}>
                {selectedEquipmentCount > 0 && (
                  <TouchableOpacity
                    style={[styles.doneButton, styles.clearButton]}
                    onPress={handleClearEquipment}>
                    <Text style={[styles.doneButtonText, styles.clearButtonText]}>Очистить</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.doneButton, selectedEquipmentCount > 0 && styles.doneButtonHalf]}
                  onPress={() => setShowEquipmentModal(false)}>
                  <Text style={styles.doneButtonText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showDistanceModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowDistanceModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDistanceModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите расстояние</Text>
                <TouchableOpacity onPress={() => setShowDistanceModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.distanceList}>
                {DISTANCE_OPTIONS.map(option => {
                  const isSelected = currentFilters.maxDistance === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.distanceItem, isSelected && styles.distanceItemSelected]}
                      onPress={() => handleDistanceChange(option.value)}>
                      <Text
                        style={[
                          styles.distanceItemText,
                          isSelected && styles.distanceItemTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {currentFilters.maxDistance && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleDistanceChange(undefined)}>
                  <Text style={styles.resetButtonText}>Сбросить фильтр</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  equipmentList: {
    padding: 16,
  },
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: 8,
  },
  equipmentItemSelected: {
    backgroundColor: COLORS.primary,
  },
  equipmentItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  equipmentItemTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  doneButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  distanceList: {
    padding: 16,
  },
  distanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: 8,
  },
  distanceItemSelected: {
    backgroundColor: COLORS.primary,
  },
  distanceItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  distanceItemTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  metroSelectorContainer: {
    minWidth: 120,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
  },
  doneButtonHalf: {
    flex: 1,
    margin: 0,
  },
  clearButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 0,
  },
  clearButtonText: {
    color: COLORS.text,
  },
  resetButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
