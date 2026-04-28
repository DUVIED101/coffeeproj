import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { APP_VERSION } from '../../config/version';

export const SupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.supportTitle') });
  }, [navigation, t]);

  const email = t('settings.legal.supportEmail');

  const openMail = async () => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch (err) {
      console.error('Error opening mail client:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>{t('settings.legal.supportContactHint')}</Text>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.6} style={styles.row} onPress={openMail}>
            <Text style={styles.rowLabel}>{email}</Text>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>{t('settings.legal.appVersion')}</Text>
          <Text style={styles.versionValue}>{APP_VERSION}</Text>
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
    padding: 16,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.background,
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
    color: COLORS.primary,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  versionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  versionValue: {
    fontSize: 14,
    color: COLORS.text,
  },
});
