import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import type { BaristaFilters, ShiftTime } from '../types/baristaProfile';
import type { Equipment } from '../types/business';
import type { CityCode } from '../types/city';
import { DEFAULT_CITY, CITY_CODES, CITY_LABELS_RU } from '../types/city';
import { COLORS } from '../config/constants';
import { MetroSelector } from './MetroSelector';

type BaristaFilterBarProps = {
  onFilterChange: (filters: BaristaFilters) => void;
  currentFilters: BaristaFilters;
  branchMetroStations?: string[];
};

const EQUIPMENT_OPTIONS: Equipment[] = [
  'La Marzocco',
  'Victoria Arduino',
  'Nuova Simonelli',
  'Synesso',
  'Slayer',
];

const SHIFT_OPTIONS: { value: ShiftTime; label: string }[] = [
  { value: 'morning', label: 'Утро' },
  { value: 'afternoon', label: 'День' },
  { value: 'evening', label: 'Вечер' },
  { value: 'night', label: 'Ночь' },
];

const EXPERIENCE_OPTIONS = [
  { value: 0, label: 'Любой' },
  { value: 1, label: '1+' },
  { value: 3, label: '3+' },
  { value: 5, label: '5+' },
  { value: 10, label: '10+' },
];

const HOURLY_CAP_OPTIONS = [
  { value: 300, label: 'до ₽300' },
  { value: 500, label: 'до ₽500' },
  { value: 800, label: 'до ₽800' },
  { value: 1000, label: 'до ₽1000' },
  { value: 1500, label: 'до ₽1500' },
];

const arraysEqualAsSet = (a?: string[], b?: string[]): boolean => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(v => setB.has(v));
};

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

export const BaristaFilterBar = React.memo<BaristaFilterBarProps>(
  ({ onFilterChange, currentFilters, branchMetroStations }) => {
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [showHourlyCapModal, setShowHourlyCapModal] = useState(false);

    const branchPresetActive = useMemo(
      () =>
        !!branchMetroStations &&
        branchMetroStations.length > 0 &&
        arraysEqualAsSet(currentFilters.metroStations, dedupe(branchMetroStations)),
      [branchMetroStations, currentFilters.metroStations]
    );

    const handleBranchPresetToggle = useCallback(() => {
      if (!branchMetroStations || branchMetroStations.length === 0) return;
      if (branchPresetActive) {
        onFilterChange({ ...currentFilters, metroStations: undefined });
      } else {
        onFilterChange({ ...currentFilters, metroStations: dedupe(branchMetroStations) });
      }
    }, [branchMetroStations, branchPresetActive, currentFilters, onFilterChange]);

    const handleEquipmentToggle = useCallback(
      (equipment: Equipment) => {
        const current = currentFilters.equipment || [];
        const next = current.includes(equipment)
          ? current.filter(e => e !== equipment)
          : [...current, equipment];
        onFilterChange({
          ...currentFilters,
          equipment: next.length > 0 ? next : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleClearEquipment = useCallback(() => {
      onFilterChange({ ...currentFilters, equipment: undefined });
      setShowEquipmentModal(false);
    }, [currentFilters, onFilterChange]);

    const handleMetroChange = useCallback(
      (stationNames: string[]) => {
        onFilterChange({
          ...currentFilters,
          metroStations: stationNames.length > 0 ? stationNames : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleShiftToggle = useCallback(
      (shift: ShiftTime) => {
        const current = currentFilters.shiftTimes || [];
        const next = current.includes(shift)
          ? current.filter(s => s !== shift)
          : [...current, shift];
        onFilterChange({
          ...currentFilters,
          shiftTimes: next.length > 0 ? next : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleClearShifts = useCallback(() => {
      onFilterChange({ ...currentFilters, shiftTimes: undefined });
      setShowShiftModal(false);
    }, [currentFilters, onFilterChange]);

    const handleExperienceSelect = useCallback(
      (years: number) => {
        onFilterChange({
          ...currentFilters,
          minYearsExperience: years === 0 ? undefined : years,
        });
        setShowExperienceModal(false);
      },
      [currentFilters, onFilterChange]
    );

    const handleHourlyCapSelect = useCallback(
      (cap?: number) => {
        onFilterChange({ ...currentFilters, hourlyRateMax: cap });
        setShowHourlyCapModal(false);
      },
      [currentFilters, onFilterChange]
    );

    const handleCityCycle = useCallback(() => {
      const current = currentFilters.city ?? DEFAULT_CITY;
      const currentIdx = CITY_CODES.indexOf(current);
      const next = CITY_CODES[(currentIdx + 1) % CITY_CODES.length];
      onFilterChange({ ...currentFilters, city: next, metroStations: undefined });
    }, [currentFilters, onFilterChange]);

    const handleCityChange = useCallback(
      (nextCity: CityCode) => {
        onFilterChange({ ...currentFilters, city: nextCity, metroStations: undefined });
      },
      [currentFilters, onFilterChange]
    );

    const selectedEquipmentCount = currentFilters.equipment?.length || 0;
    const selectedShiftCount = currentFilters.shiftTimes?.length || 0;
    const hasMinExperience = currentFilters.minYearsExperience !== undefined;
    const hasHourlyCap = currentFilters.hourlyRateMax !== undefined;
    const activeCity: CityCode = currentFilters.city ?? DEFAULT_CITY;
    const hasCity = currentFilters.city !== undefined;

    const experienceLabel = hasMinExperience
      ? `Опыт ${currentFilters.minYearsExperience}+`
      : 'Опыт';
    const hourlyCapLabel = hasHourlyCap
      ? `до ₽${currentFilters.hourlyRateMax?.toLocaleString('ru-RU')}/час`
      : 'До ₽/час';
    const cityLabel = `Город: ${CITY_LABELS_RU[activeCity]}`;

    const showBranchPreset = !!branchMetroStations && branchMetroStations.length > 0;

    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {showBranchPreset && (
            <TouchableOpacity
              style={[styles.filterChip, branchPresetActive && styles.filterChipActive]}
              onPress={handleBranchPresetToggle}>
              <Text
                style={[styles.filterChipText, branchPresetActive && styles.filterChipTextActive]}>
                Рядом с моими точками
              </Text>
            </TouchableOpacity>
          )}

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
              city={activeCity}
              onCityChange={handleCityChange}
              value={currentFilters.metroStations ?? []}
              onChange={handleMetroChange}
              placeholder="Метро"
            />
          </View>

          <TouchableOpacity
            style={[styles.filterChip, selectedShiftCount > 0 && styles.filterChipActive]}
            onPress={() => setShowShiftModal(true)}>
            <Text
              style={[
                styles.filterChipText,
                selectedShiftCount > 0 && styles.filterChipTextActive,
              ]}>
              Смена
              {selectedShiftCount > 0 && ` (${selectedShiftCount})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, hasMinExperience && styles.filterChipActive]}
            onPress={() => setShowExperienceModal(true)}>
            <Text style={[styles.filterChipText, hasMinExperience && styles.filterChipTextActive]}>
              {experienceLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, hasHourlyCap && styles.filterChipActive]}
            onPress={() => setShowHourlyCapModal(true)}>
            <Text style={[styles.filterChipText, hasHourlyCap && styles.filterChipTextActive]}>
              {hourlyCapLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, hasCity && styles.filterChipActive]}
            onPress={handleCityCycle}>
            <Text style={[styles.filterChipText, hasCity && styles.filterChipTextActive]}>
              {cityLabel}
            </Text>
          </TouchableOpacity>
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

              <View style={styles.optionList}>
                {EQUIPMENT_OPTIONS.map(equipment => {
                  const isSelected = currentFilters.equipment?.includes(equipment) || false;
                  return (
                    <TouchableOpacity
                      key={equipment}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => handleEquipmentToggle(equipment)}>
                      <Text
                        style={[
                          styles.optionItemText,
                          isSelected && styles.optionItemTextSelected,
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
          visible={showShiftModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowShiftModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowShiftModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите смену</Text>
                <TouchableOpacity onPress={() => setShowShiftModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.optionList}>
                {SHIFT_OPTIONS.map(option => {
                  const isSelected = currentFilters.shiftTimes?.includes(option.value) || false;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => handleShiftToggle(option.value)}>
                      <Text
                        style={[
                          styles.optionItemText,
                          isSelected && styles.optionItemTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtonsRow}>
                {selectedShiftCount > 0 && (
                  <TouchableOpacity
                    style={[styles.doneButton, styles.clearButton]}
                    onPress={handleClearShifts}>
                    <Text style={[styles.doneButtonText, styles.clearButtonText]}>Очистить</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.doneButton, selectedShiftCount > 0 && styles.doneButtonHalf]}
                  onPress={() => setShowShiftModal(false)}>
                  <Text style={styles.doneButtonText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showExperienceModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowExperienceModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowExperienceModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Минимальный опыт</Text>
                <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.optionList}>
                {EXPERIENCE_OPTIONS.map(option => {
                  const isSelected =
                    option.value === 0
                      ? currentFilters.minYearsExperience === undefined
                      : currentFilters.minYearsExperience === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => handleExperienceSelect(option.value)}>
                      <Text
                        style={[
                          styles.optionItemText,
                          isSelected && styles.optionItemTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showHourlyCapModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowHourlyCapModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowHourlyCapModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Максимальная ставка</Text>
                <TouchableOpacity onPress={() => setShowHourlyCapModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.optionList}>
                {HOURLY_CAP_OPTIONS.map(option => {
                  const isSelected = currentFilters.hourlyRateMax === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => handleHourlyCapSelect(option.value)}>
                      <Text
                        style={[
                          styles.optionItemText,
                          isSelected && styles.optionItemTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {hasHourlyCap && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleHourlyCapSelect(undefined)}>
                  <Text style={styles.resetButtonText}>Сбросить</Text>
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
    borderRadius: 999,
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
  optionList: {
    padding: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: 8,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primary,
  },
  optionItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionItemTextSelected: {
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
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
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
    borderRadius: 999,
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
  metroSelectorContainer: {
    minWidth: 120,
  },
});
