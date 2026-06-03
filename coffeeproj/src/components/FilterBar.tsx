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
import { useTranslation } from 'react-i18next';
import type { JobFilters, JobType } from '../types/job';
import type { GeoPoint } from '../types/business';
import type { CityCode } from '../types/city';
import { DEFAULT_CITY } from '../types/city';
import { COLORS } from '../config/constants';
import { MetroSelector, METRO_ANY } from './MetroSelector';

interface FilterBarProps {
  onFilterChange: (filters: JobFilters) => void;
  currentFilters: JobFilters;
  userLocation?: GeoPoint;
}

const DISTANCE_OPTIONS_KM = [5, 10, 25, 50] as const;

export const FilterBar = React.memo<FilterBarProps>(
  ({ onFilterChange, currentFilters, userLocation }) => {
    const { t } = useTranslation();
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

    const handleMetroChange = useCallback(
      (stationNames: string[]) => {
        // Filter context: "Любая" === no filter, so strip the sentinel before
        // it can reach the JobService search query.
        const real = stationNames.filter(s => s !== METRO_ANY);
        onFilterChange({
          ...currentFilters,
          metroStations: real.length > 0 ? real : undefined,
        });
      },
      [currentFilters, onFilterChange]
    );

    const handleCityChange = useCallback(
      (nextCity: CityCode) => {
        onFilterChange({
          ...currentFilters,
          city: nextCity,
          metroStations: undefined,
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

    const getDistanceLabel = (distance?: number): string => {
      if (!distance) return t('filters.distance');
      const km = distance / 1000;
      return t('filters.distanceKm', { km });
    };

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
              {t('filters.jobType.all')}
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
              {t('filters.jobType.temporary')}
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
              {t('filters.jobType.permanent')}
            </Text>
          </TouchableOpacity>

          <View style={styles.metroSelectorContainer}>
            <MetroSelector
              multiSelect
              city={currentFilters.city ?? DEFAULT_CITY}
              onCityChange={handleCityChange}
              value={currentFilters.metroStations ?? []}
              onChange={handleMetroChange}
              placeholder={t('filters.metroStation')}
              userLocation={userLocation}
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
          visible={showDistanceModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowDistanceModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDistanceModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('filters.chooseDistance')}</Text>
                <TouchableOpacity onPress={() => setShowDistanceModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.distanceList}>
                {DISTANCE_OPTIONS_KM.map(km => {
                  const value = km * 1000;
                  const isSelected = currentFilters.maxDistance === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.distanceItem, isSelected && styles.distanceItemSelected]}
                      onPress={() => handleDistanceChange(value)}>
                      <Text
                        style={[
                          styles.distanceItemText,
                          isSelected && styles.distanceItemTextSelected,
                        ]}>
                        {t('filters.distanceKm', { km })}
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
                  <Text style={styles.resetButtonText}>{t('filters.reset')}</Text>
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
  distanceList: {
    padding: 16,
  },
  distanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
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
});
