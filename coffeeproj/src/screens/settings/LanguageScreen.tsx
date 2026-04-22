import React, { useLayoutEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { changeLanguage, getCurrentLanguage } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Navigation = NativeStackNavigationProp<SettingsStackParamList, 'Language'>;

type Option = { value: SupportedLanguage; labelKey: string };

const OPTIONS: ReadonlyArray<Option> = [
  { value: 'ru', labelKey: 'settings.language.russian' },
  { value: 'en', labelKey: 'settings.language.english' },
];

export const LanguageScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SupportedLanguage>(getCurrentLanguage());

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.language.title') });
  }, [navigation, t]);

  const handleSelect = useCallback(
    async (lang: SupportedLanguage) => {
      setSelected(lang);
      try {
        await changeLanguage(lang);
      } catch (err) {
        console.error('Error in changeLanguage:', err);
      }
      navigation.goBack();
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {OPTIONS.map((option, idx) => {
            const isSelected = option.value === selected;
            return (
              <React.Fragment key={option.value}>
                <TouchableOpacity
                  activeOpacity={0.6}
                  style={styles.row}
                  onPress={() => handleSelect(option.value)}>
                  <Text style={styles.rowLabel}>{t(option.labelKey)}</Text>
                  {isSelected ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
                </TouchableOpacity>
                {idx < OPTIONS.length - 1 ? <View style={styles.separator} /> : null}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  card: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 44,
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  checkmark: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
});
