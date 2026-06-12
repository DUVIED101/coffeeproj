import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';

type Navigation = NativeStackNavigationProp<SettingsStackParamList, 'Documents'>;

type RowProps = {
  label: string;
  onPress: () => void;
};

const DocumentRow: React.FC<RowProps> = ({ label, onPress }) => (
  <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>{'>'}</Text>
    </View>
  </TouchableOpacity>
);

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.items.documents') });
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <DocumentRow
            label={t('settings.items.terms')}
            onPress={() => navigation.navigate('Terms')}
          />
          <View style={styles.separator} />
          <DocumentRow
            label={t('settings.items.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={styles.separator} />
          <DocumentRow
            label={t('settings.items.personalDataPolicy')}
            onPress={() => navigation.navigate('PersonalDataPolicy')}
          />
          <View style={styles.separator} />
          <DocumentRow
            label={t('settings.items.dataConsent')}
            onPress={() => navigation.navigate('DataConsent')}
          />
          <View style={styles.separator} />
          {/* Yandex Maps API free-tier terms (yandex.ru/dev/commercial п.6):
              the app must surface a link to the API terms. */}
          <DocumentRow
            label={t('settings.items.yandexMapsTerms')}
            onPress={() => {
              void Linking.openURL('https://yandex.ru/legal/maps_api/');
            }}
          />
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
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
});
