import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/constants';
import type { AccountType } from '../../types';
import { APP_VERSION } from '../../config/version';
import { getDeviceTimezone, pickSupabaseHostSync, PROXY_URL } from '../../config/supabaseHost';

type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
  Diagnostic: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AccountType'>;
};

export const AccountTypeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();

  const handleSelectType = (accountType: AccountType) => {
    navigation.navigate('Signup', { accountType });
  };

  // Build-info banner (Phase 8.6 Phase 2). Surfaces the host-routing pick
  // and TZ at a glance — RU testers without a sign-in can confirm whether
  // the device is going through the proxy by reading this line.
  const bootInfo = useMemo(() => {
    const tz = getDeviceTimezone() ?? '?';
    const { url, reason } = pickSupabaseHostSync();
    const host = url.replace(/^https?:\/\//, '');
    return `v${APP_VERSION} · tz:${tz} · ${reason}:${host}${PROXY_URL ? '' : ' · proxy:unset'}`;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={1}
            delayLongPress={1500}
            onLongPress={() => navigation.navigate('Diagnostic')}>
            <Text style={styles.title}>{t('auth.accountType.welcome')}</Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>{t('auth.accountType.subtitle')}</Text>
        </View>

        {/* Account Type Selection */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.baristaButton]}
            onPress={() => handleSelectType('barista')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="coffee" size={48} color={COLORS.primary} />
            <Text style={styles.buttonTitle}>{t('auth.accountType.baristaTitle')}</Text>
            <Text style={styles.buttonDescription}>{t('auth.accountType.baristaDescription')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.businessButton]}
            onPress={() => handleSelectType('business')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="storefront" size={48} color={COLORS.secondary} />
            <Text style={styles.buttonTitle}>{t('auth.accountType.businessTitle')}</Text>
            <Text style={styles.buttonDescription}>
              {t('auth.accountType.businessDescription')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.accountType.haveAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>{t('auth.accountType.loginLink')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.bootInfo} numberOfLines={2}>
          {bootInfo}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  baristaButton: {
    borderColor: COLORS.primary,
  },
  businessButton: {
    borderColor: COLORS.secondary,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  buttonDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bootInfo: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: 'Menlo',
    opacity: 0.6,
  },
});
