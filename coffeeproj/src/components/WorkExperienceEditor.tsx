import React from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '../config/constants';
import { MonthYearPicker } from './MonthYearPicker';
import { MAX_WORK_EXPERIENCES, computeDuration, makeEmptyDraft, type WorkExperienceDraft, type WorkExperienceFieldError } from "../types/workExperience";
import { clampToEffectiveLength } from '../utils/textLength';

type Props = {
  experiences: WorkExperienceDraft[];
  onChange: (next: WorkExperienceDraft[]) => void;
  disabled?: boolean;
  /**
   * Per-index field errors. Parent computes these via `findDraftErrors` after
   * a save attempt and re-renders so each card highlights the missing inputs.
   */
  errorsByIndex?: ReadonlyArray<ReadonlyArray<WorkExperienceFieldError>>;
};

const EMPLOYER_MAX = 120;
const POSITION_MAX = 80;
const DESCRIPTION_MAX = 500;

export const WorkExperienceEditor: React.FC<Props> = ({
  experiences,
  onChange,
  disabled = false,
  errorsByIndex,
}) => {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<WorkExperienceDraft>): void => {
    onChange(experiences.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const add = (): void => {
    if (experiences.length >= MAX_WORK_EXPERIENCES) return;
    onChange([...experiences, makeEmptyDraft()]);
  };

  const confirmRemove = (index: number): void => {
    Alert.alert(t('barista.workExperience.removeConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => onChange(experiences.filter((_, i) => i !== index)),
      },
    ]);
  };

  return (
    <View>
      {experiences.map((exp, index) => {
        const cardErrors = errorsByIndex?.[index] ?? [];
        const hasError = (field: WorkExperienceFieldError): boolean => cardErrors.includes(field);
        const duration =
          exp.startYear !== null && exp.startMonth !== null
            ? computeDuration({
                startYear: exp.startYear,
                startMonth: exp.startMonth,
                endYear: exp.endYear,
                endMonth: exp.endMonth,
                isCurrent: exp.isCurrent,
              })
            : { years: 0, months: 0 };

        const showDuration = exp.startYear !== null && exp.startMonth !== null;

        return (
          <View key={index} style={[styles.card, cardErrors.length > 0 && styles.cardError]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>#{index + 1}</Text>
              <TouchableOpacity
                onPress={() => confirmRemove(index)}
                hitSlop={8}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                style={styles.removeButton}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <MonthYearPicker
                  label={t('barista.workExperience.startDate') + ' *'}
                  value={
                    exp.startYear !== null && exp.startMonth !== null
                      ? { year: exp.startYear, month: exp.startMonth }
                      : null
                  }
                  onChange={({ year, month }) =>
                    update(index, { startYear: year, startMonth: month })
                  }
                  disabled={disabled}
                />
              </View>
              <View style={styles.half}>
                <MonthYearPicker
                  label={t('barista.workExperience.endDate')}
                  value={
                    !exp.isCurrent && exp.endYear !== null && exp.endMonth !== null
                      ? { year: exp.endYear, month: exp.endMonth }
                      : null
                  }
                  onChange={({ year, month }) => {
                    // Reject end-before-start. Caller can either ignore or surface
                    // an alert — here we silently clamp to the start so the UI
                    // doesn't accept an inconsistent state.
                    if (exp.startYear !== null && exp.startMonth !== null) {
                      const startKey = exp.startYear * 12 + exp.startMonth;
                      const endKey = year * 12 + month;
                      if (endKey < startKey) {
                        update(index, {
                          endYear: exp.startYear,
                          endMonth: exp.startMonth,
                          isCurrent: false,
                        });
                        return;
                      }
                    }
                    update(index, { endYear: year, endMonth: month, isCurrent: false });
                  }}
                  disabled={disabled || exp.isCurrent}
                  minYear={exp.startYear ?? undefined}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('barista.workExperience.currentlyWorking')}</Text>
              <Switch
                value={exp.isCurrent}
                onValueChange={v =>
                  update(index, {
                    isCurrent: v,
                    endYear: v ? null : exp.endYear,
                    endMonth: v ? null : exp.endMonth,
                  })
                }
                disabled={disabled}
              />
            </View>

            {showDuration && (
              <Text style={styles.duration}>
                {t('barista.workExperience.duration', {
                  years: duration.years,
                  months: duration.months,
                })}
              </Text>
            )}

            <Text style={styles.label}>
              {t('barista.workExperience.employer')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, hasError('employer') && styles.inputError]}
              value={exp.employer}
              onChangeText={text => update(index, { employer: text })}
              placeholder={t('workExperienceEditor.employerPlaceholder', {
                defaultValue: 'Surf Coffee',
              })}
              placeholderTextColor={COLORS.textSecondary}
              maxLength={EMPLOYER_MAX}
              editable={!disabled}
            />

            <Text style={styles.label}>
              {t('barista.workExperience.position')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, hasError('position') && styles.inputError]}
              value={exp.position}
              onChangeText={text => update(index, { position: text })}
              placeholder={t('workExperienceEditor.positionPlaceholder', {
                defaultValue: 'Бариста',
              })}
              placeholderTextColor={COLORS.textSecondary}
              maxLength={POSITION_MAX}
              editable={!disabled}
            />

            {cardErrors.length > 0 && (
              <Text style={styles.errorText}>
                {t('barista.workExperience.errors.fillRequired', {
                  defaultValue: 'Заполните обязательные поля или удалите запись.',
                })}
              </Text>
            )}

            <Text style={styles.label}>{t('barista.workExperience.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={exp.description ?? ''}
              onChangeText={text => {
                const clamped = clampToEffectiveLength(text, DESCRIPTION_MAX);
                update(index, { description: clamped.length > 0 ? clamped : null });
              }}
              placeholder=""
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!disabled}
            />
          </View>
        );
      })}

      {experiences.length < MAX_WORK_EXPERIENCES ? (
        <TouchableOpacity onPress={add} disabled={disabled} style={styles.addButton}>
          <Text style={styles.addButtonText}>{t('barista.workExperience.addButton')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.limitText}>
          {t('barista.workExperience.limitReached', { max: MAX_WORK_EXPERIENCES })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.card,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardError: {
    borderColor: COLORS.error,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  duration: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 70,
    maxHeight: 180,
  },
  addButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
