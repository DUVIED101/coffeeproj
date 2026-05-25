import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authorize, type AuthConfiguration } from 'react-native-app-auth';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GOOGLE_IOS_CLIENT_ID, YANDEX_CLIENT_ID } from '@env';
import { COLORS } from '../config/constants';
import { AuthService } from '../services/AuthService';
import { stashPendingAccountType } from '../utils/socialAuthStash';
import { getErrorMessage } from '../utils/getErrorMessage';
import type { AccountType } from '../types';

type Provider = 'apple' | 'google' | 'yandex';

type Props = {
  accountType?: AccountType;
  separatorLabel?: string;
};

const YANDEX_CONFIG: AuthConfiguration = {
  issuer: '',
  clientId: YANDEX_CLIENT_ID ?? '',
  redirectUrl: 'com.quickbarista.app.yandex://oauth',
  scopes: ['login:email', 'login:info'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://oauth.yandex.ru/authorize',
    tokenEndpoint: 'https://oauth.yandex.ru/token',
  },
  usePKCE: false,
  additionalParameters: { force_confirm: 'yes' },
};

let googleConfigured = false;
const ensureGoogleConfigured = (): boolean => {
  if (!GOOGLE_IOS_CLIENT_ID) return false;
  if (googleConfigured) return true;
  GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });
  googleConfigured = true;
  return true;
};

export const SocialAuthButtons: React.FC<Props> = ({ accountType, separatorLabel }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Provider | null>(null);

  const handleApple = useCallback(async () => {
    if (busy) return;
    setBusy('apple');
    try {
      if (accountType) await stashPendingAccountType(accountType);

      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!response.identityToken) {
        throw new Error('apple_no_identity_token');
      }

      await AuthService.signInWithApple(response.identityToken, response.nonce);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === appleAuth.Error.CANCELED) return;
      Alert.alert(t('auth.social.appleErrorTitle'), getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, t]);

  const handleGoogle = useCallback(async () => {
    if (busy) return;
    if (!ensureGoogleConfigured()) {
      Alert.alert(t('auth.social.googleErrorTitle'), t('auth.social.googleConfigMissing'));
      return;
    }
    setBusy('google');
    try {
      if (accountType) await stashPendingAccountType(accountType);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      const result = (await GoogleSignin.signIn()) as Record<string, unknown>;
      const direct = typeof result.idToken === 'string' ? result.idToken : undefined;
      const wrapped =
        result.data && typeof (result.data as { idToken?: unknown }).idToken === 'string'
          ? (result.data as { idToken: string }).idToken
          : undefined;
      const idToken = direct ?? wrapped;
      if (!idToken) {
        throw new Error('google_no_id_token');
      }
      await AuthService.signInWithGoogle(idToken);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert(t('auth.social.googleErrorTitle'), getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, t]);

  const handleYandex = useCallback(async () => {
    if (busy) return;
    if (!YANDEX_CLIENT_ID) {
      Alert.alert(t('auth.social.yandexErrorTitle'), t('auth.social.yandexConfigMissing'));
      return;
    }
    setBusy('yandex');
    try {
      if (accountType) await stashPendingAccountType(accountType);

      const result = await authorize(YANDEX_CONFIG);
      if (!result.accessToken) {
        throw new Error('yandex_no_access_token');
      }
      await AuthService.signInWithYandex(result.accessToken);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('user cancelled')) return;
      Alert.alert(t('auth.social.yandexErrorTitle'), message);
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, t]);

  return (
    <View style={styles.container}>
      {separatorLabel && (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorLabel}>{separatorLabel}</Text>
          <View style={styles.separatorLine} />
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.iconButton, styles.appleButton]}
          onPress={handleApple}
          disabled={busy !== null}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.appleLabel')}>
          {busy === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialCommunityIcons name="apple" size={28} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.googleButton]}
          onPress={handleGoogle}
          disabled={busy !== null}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.googleLabel')}>
          {busy === 'google' ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <MaterialCommunityIcons name="google" size={26} color={COLORS.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.yandexButton]}
          onPress={handleYandex}
          disabled={busy !== null}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.yandexLabel')}>
          {busy === 'yandex' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.yandexIcon}>Я</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ICON_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  separatorLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 4,
  },
  iconButton: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yandexButton: {
    backgroundColor: '#FC3F1D',
  },
  yandexIcon: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 28,
  },
});
