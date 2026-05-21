import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, RADII } from '../config/constants';

type Props = {
  value: { year: number; month: number } | null;
  onChange: (next: { year: number; month: number }) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
};

const formatMonthYear = (year: number, month: number): string => {
  const d = new Date(year, month - 1, 1);
  const formatted = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const MonthYearPicker: React.FC<Props> = ({
  value,
  onChange,
  label,
  placeholder = 'Выбрать',
  disabled = false,
  minYear = 1960,
  maxYear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const seedDate = value ? new Date(value.year, value.month - 1, 1) : new Date();
  const maxDate = new Date(maxYear ?? new Date().getFullYear(), 11, 31);
  const minDate = new Date(minYear, 0, 1);

  const openPicker = (): void => {
    if (disabled) return;
    setDraftDate(seedDate);
    setIsOpen(true);
  };

  const closePicker = (): void => {
    setIsOpen(false);
    setDraftDate(null);
  };

  const commit = (date: Date): void => {
    onChange({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };

  const handleIosChange = (_event: unknown, date?: Date): void => {
    if (date) setDraftDate(date);
  };

  const handleAndroidChange = (_event: unknown, date?: Date): void => {
    setIsOpen(false);
    if (date) commit(date);
  };

  const handleDone = (): void => {
    if (draftDate) commit(draftDate);
    closePicker();
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        disabled={disabled}>
        <Text style={[styles.text, !value && styles.placeholderText]}>
          {value ? formatMonthYear(value.year, value.month) : placeholder}
        </Text>
      </TouchableOpacity>

      {isOpen && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={seedDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
          statusBarTranslucent>
          <Pressable style={styles.backdrop} onPress={closePicker}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <DateTimePicker
                value={draftDate ?? seedDate}
                mode="date"
                display="inline"
                themeVariant="light"
                textColor="#000000"
                onChange={handleIosChange}
                maximumDate={maxDate}
                minimumDate={minDate}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={closePicker} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
                  <Text style={styles.doneText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  button: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 15,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADII.pill,
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
