import React, { useLayoutEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { changeLanguage, getCurrentLanguage } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../stores/authStore';

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
  const [isChanging, setIsChanging] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.language.title') });
  }, [navigation, t]);

  const handleSelect = useCallback(
    async (lang: SupportedLanguage) => {
      if (isChanging) return;
      setSelected(lang);
      setIsChanging(true);
      try {
        await changeLanguage(lang);
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          // Best-effort: persist language to DB for server-rendered notifications.
          // Failure here is non-fatal — client-side i18n still works via AsyncStorage.
          const { error } = await supabase
            .from('users')
            .update({ language: lang })
            .eq('id', userId);
          if (error) console.warn('Could not persist users.language:', error.message);
        }
        navigation.goBack();
      } catch (err) {
        console.error('Error in changeLanguage:', err);
      } finally {
        setIsChanging(false);
      }
    },
    [navigation, isChanging]
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
                  onPress={() => handleSelect(option.value)}
                  disabled={isChanging}>
                  <Text style={styles.rowLabel}>{t(option.labelKey)}</Text>
                  {isSelected && isChanging ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : isSelected ? (
                    <Text style={styles.checkmark}>{'✓'}</Text>
                  ) : null}
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
    borderRadius: 12,
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
