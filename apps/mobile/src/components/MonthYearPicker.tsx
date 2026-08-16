import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
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

const buildMonthLabels = (locale: string): string[] => {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2000, i, 1);
    const name = d.toLocaleDateString(locale, { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
};

export const MonthYearPicker: React.FC<Props> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  minYear = 1960,
  maxYear,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const resolvedPlaceholder =
    placeholder ?? t('monthYearPicker.placeholder', { defaultValue: 'Выбрать' });
  const resolvedMaxYear = maxYear ?? new Date().getFullYear();

  const [isOpen, setIsOpen] = useState(false);
  const initialMonth = value?.month ?? new Date().getMonth() + 1;
  const initialYear = value?.year ?? resolvedMaxYear;
  const [draftMonth, setDraftMonth] = useState<number>(initialMonth);
  const [draftYear, setDraftYear] = useState<number>(initialYear);

  const monthLabels = useMemo(() => buildMonthLabels(locale), [locale]);
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = resolvedMaxYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, resolvedMaxYear]);

  const openPicker = (): void => {
    if (disabled) return;
    setDraftMonth(value?.month ?? new Date().getMonth() + 1);
    setDraftYear(value?.year ?? resolvedMaxYear);
    setIsOpen(true);
  };

  const closePicker = (): void => {
    setIsOpen(false);
  };

  const handleDone = (): void => {
    onChange({ year: draftYear, month: draftMonth });
    closePicker();
  };

  // Android: keep the native calendar dialog — it already opens as its own
  // modal with no day-only/month-only split issues, and is the platform norm.
  const seedDate = value ? new Date(value.year, value.month - 1, 1) : new Date();
  const maxDate = new Date(resolvedMaxYear, 11, 31);
  const minDate = new Date(minYear, 0, 1);

  const handleAndroidChange = (_event: unknown, date?: Date): void => {
    setIsOpen(false);
    if (date) onChange({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ?? resolvedPlaceholder}
        disabled={disabled}>
        <Text style={[styles.text, !value && styles.placeholderText]}>
          {value ? formatMonthYear(value.year, value.month) : resolvedPlaceholder}
        </Text>
      </TouchableOpacity>

      {isOpen && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={seedDate}
          mode="date"
          display="default"
          onValueChange={handleAndroidChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={isOpen}
          transparent
          animationType="slide"
          onRequestClose={closePicker}
          statusBarTranslucent>
          <Pressable style={styles.backdrop} onPress={closePicker}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.wheels}>
                <Picker
                  selectedValue={draftMonth}
                  onValueChange={v => setDraftMonth(Number(v))}
                  style={styles.wheel}
                  itemStyle={styles.wheelItem}>
                  {monthLabels.map((name, i) => (
                    <Picker.Item key={i + 1} label={name} value={i + 1} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={draftYear}
                  onValueChange={v => setDraftYear(Number(v))}
                  style={styles.wheel}
                  itemStyle={styles.wheelItem}>
                  {years.map(y => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={closePicker} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>
                    {t('monthYearPicker.cancel', { defaultValue: 'Отмена' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
                  <Text style={styles.doneText}>
                    {t('monthYearPicker.done', { defaultValue: 'Готово' })}
                  </Text>
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
  wheels: {
    flexDirection: 'row',
  },
  wheel: {
    flex: 1,
  },
  wheelItem: {
    fontSize: 20,
    color: '#000',
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
