import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { getCurrentLanguage } from '../../i18n';
import type { SettingsStackParamList } from '../../navigation/SettingsStack';
import { APP_VERSION } from '../../config/version';
import { hasPasswordAuth } from '../../utils/authProvider';

type Navigation = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

type RowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
};

const SettingsRow: React.FC<RowProps> = ({ label, value, onPress, destructive, showChevron }) => {
  const body = (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? <Text style={styles.chevron}>{'>'}</Text> : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
      {body}
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const session = useAuthStore(s => s.session);
  const signOut = useAuthStore(s => s.signOut);

  const hasEmailLogin = hasPasswordAuth(session);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('settings.title'),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.getParent()?.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.headerBackButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t]);

  const currentLang = getCurrentLanguage();
  const langLabel =
    currentLang === 'ru' ? t('settings.language.russian') : t('settings.language.english');

  const handleSignOut = () => {
    Alert.alert(t('settings.items.signOut'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.items.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Error in signOut:', err);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>{t('settings.sections.account').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow label={t('settings.items.email')} value={user?.email ?? '—'} />
          <View style={styles.separator} />
          {hasEmailLogin && (
            <>
              <SettingsRow
                label={t('settings.items.changePassword')}
                onPress={() => navigation.navigate('ChangePassword')}
                showChevron
              />
              <View style={styles.separator} />
            </>
          )}
          <SettingsRow
            label={t('settings.items.verificationStatus')}
            value={user?.isVerified ? '🟢' : '—'}
          />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.sections.preferences').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow
            label={t('settings.items.language')}
            value={langLabel}
            onPress={() => navigation.navigate('Language')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.notifications')}
            onPress={() => navigation.navigate('Notifications')}
            showChevron
          />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.sections.privacy').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow
            label={t('settings.items.visibility')}
            onPress={() => navigation.navigate('Visibility')}
            showChevron
          />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.sections.about').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow
            label={t('settings.items.terms')}
            onPress={() => navigation.navigate('Terms')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.personalDataPolicy')}
            onPress={() => navigation.navigate('PersonalDataPolicy')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.dataConsent')}
            onPress={() => navigation.navigate('DataConsent')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.support')}
            onPress={() => navigation.navigate('Support')}
            showChevron
          />
          <View style={styles.separator} />
          <SettingsRow label={t('settings.items.appVersion')} value={APP_VERSION} />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.diagnostic')}
            onPress={() => navigation.navigate('Diagnostic')}
            showChevron
          />
          <View style={styles.separator} />
          {/* Yandex Maps API free-tier terms (yandex.ru/dev/commercial п.6):
              the app must surface a link to the API terms in About. */}
          <SettingsRow
            label={t('settings.items.yandexMapsTerms')}
            onPress={() => {
              void Linking.openURL('https://yandex.ru/legal/maps_api/');
            }}
            showChevron
          />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.sections.activity').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow
            label={t('settings.items.myDisputes')}
            onPress={() => navigation.navigate('MyDisputes')}
            showChevron
          />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.sections.dangerZone').toUpperCase()}</Text>
        <View style={styles.card}>
          <SettingsRow label={t('settings.items.signOut')} destructive onPress={handleSignOut} />
          <View style={styles.separator} />
          <SettingsRow
            label={t('settings.items.deleteAccount')}
            destructive
            onPress={() => navigation.navigate('DeleteAccount')}
            showChevron
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
  headerBackButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  sectionHeader: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
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
  rowLabelDestructive: {
    color: COLORS.error,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  rowValue: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
});
