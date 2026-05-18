import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII, EQUIPMENT_TYPES } from '../config/constants';
import { MetroSelector } from './MetroSelector';
import type { JobType } from '../types/job';
import type { Equipment } from '../types/business';

export type ShiftFilters = {
  jobType?: JobType;
  metroStations?: string[];
  equipment?: Equipment[];
  includeArchive: boolean;
};

type ShiftFilterSheetProps = {
  visible: boolean;
  initialFilters: ShiftFilters;
  onApply: (filters: ShiftFilters) => void;
  onClose: () => void;
};

const EQUIPMENT_OPTIONS: readonly Equipment[] = EQUIPMENT_TYPES;

export const ShiftFilterSheet: React.FC<ShiftFilterSheetProps> = ({
  visible,
  initialFilters,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ShiftFilters>(initialFilters);

  React.useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const handleSetJobType = useCallback((jobType?: JobType) => {
    setDraft(prev => ({ ...prev, jobType }));
  }, []);

  const handleToggleEquipment = useCallback((eq: Equipment) => {
    setDraft(prev => {
      const current = prev.equipment ?? [];
      const next = current.includes(eq) ? current.filter(e => e !== eq) : [...current, eq];
      return { ...prev, equipment: next.length > 0 ? next : undefined };
    });
  }, []);

  const handleMetroChange = useCallback((stations: string[]) => {
    setDraft(prev => ({
      ...prev,
      metroStations: stations.length > 0 ? stations : undefined,
    }));
  }, []);

  const handleArchiveToggle = useCallback((value: boolean) => {
    setDraft(prev => ({ ...prev, includeArchive: value }));
  }, []);

  const handleReset = useCallback(() => {
    setDraft({ includeArchive: false });
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('shifts.filter.title')}</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>{t('shifts.filter.reset')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>{t('shifts.filter.jobType')}</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, !draft.jobType && styles.pillActive]}
                onPress={() => handleSetJobType(undefined)}>
                <Text style={[styles.pillText, !draft.jobType && styles.pillTextActive]}>
                  {t('shifts.filter.allTypes')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, draft.jobType === 'temporary' && styles.pillActive]}
                onPress={() => handleSetJobType('temporary')}>
                <Text
                  style={[styles.pillText, draft.jobType === 'temporary' && styles.pillTextActive]}>
                  {t('shifts.filter.temporary')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, draft.jobType === 'permanent' && styles.pillActive]}
                onPress={() => handleSetJobType('permanent')}>
                <Text
                  style={[styles.pillText, draft.jobType === 'permanent' && styles.pillTextActive]}>
                  {t('shifts.filter.permanent')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('shifts.filter.metro')}</Text>
            <MetroSelector
              multiSelect
              value={draft.metroStations ?? []}
              onChange={handleMetroChange}
              placeholder={t('shifts.filter.metroPlaceholder')}
            />

            <Text style={styles.sectionTitle}>{t('shifts.filter.equipment')}</Text>
            <View style={styles.equipmentGrid}>
              {EQUIPMENT_OPTIONS.map(eq => {
                const selected = draft.equipment?.includes(eq) ?? false;
                return (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.pill, selected && styles.pillActive]}
                    onPress={() => handleToggleEquipment(eq)}>
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>{eq}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchLabel}>{t('shifts.filter.includeArchive')}</Text>
                <Text style={styles.switchSubLabel}>{t('shifts.filter.archiveSubLabel')}</Text>
              </View>
              <Switch
                value={draft.includeArchive}
                onValueChange={handleArchiveToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>{t('shifts.filter.apply')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  resetText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 16,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.text,
  },
  pillTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  switchTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  switchSubLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADII.card,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
});
