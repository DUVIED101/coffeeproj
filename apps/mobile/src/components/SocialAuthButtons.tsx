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
import { stashPendingAccountType, clearPendingAccountType } from '../utils/socialAuthStash';
import { stashConsentAccepted, clearStashedConsent } from '../utils/consentStash';
import { getErrorMessage } from '../utils/getErrorMessage';
import type { AccountType } from '../types';

type Provider = 'apple' | 'google' | 'yandex';

type Props = {
  accountType?: AccountType;
  separatorLabel?: string;
  disabled?: boolean;
  // When true (only set by SignupScreen, after the user has ticked both
  // consent boxes), stash a flag so ProfileBootstrap persists
  // consent_accepted_at without showing the in-bootstrap consent gate. When
  // false/undefined (LoginScreen), no flag is stashed and the new user lands
  // at the consent gate before being allowed into MainTabs.
  consentAccepted?: boolean;
};

// Yandex iOS callback format used by their own Login SDK (and the only
// format Yandex accepts for "iOS-приложение" registrations): triple-slash
// custom scheme with the documented path + platform query. The simpler
// `yx<client_id>://` form is rejected with "redirect_uri не совпадает с
// Callback URL" — Yandex's server compares string-exact. The URL scheme is
// registered in ios/coffeeproj/Info.plist.
//
// PKCE is required: this is a public native client with no stored
// client_secret, so the /token call would otherwise be rejected with
// "Wrong client secret / invalid_client". The PKCE code_verifier replaces
// the missing secret.
//
// `additionalParameters` is intentionally absent: react-native-app-auth
// forwards it to BOTH /authorize and /token, and Yandex's /token rejects
// unknown params with a 400.
const YANDEX_CONFIG: AuthConfiguration = {
  clientId: YANDEX_CLIENT_ID ?? '',
  redirectUrl: YANDEX_CLIENT_ID ? `yx${YANDEX_CLIENT_ID}:///auth/finish?platform=ios` : '',
  scopes: ['login:email', 'login:info'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://oauth.yandex.ru/authorize',
    tokenEndpoint: 'https://oauth.yandex.ru/token',
  },
  usePKCE: true,
};

let googleConfigured = false;
const ensureGoogleConfigured = (): boolean => {
  if (!GOOGLE_IOS_CLIENT_ID) return false;
  if (googleConfigured) return true;
  GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });
  googleConfigured = true;
  return true;
};

export const SocialAuthButtons: React.FC<Props> = ({
  accountType,
  separatorLabel,
  disabled = false,
  consentAccepted = false,
}) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Provider | null>(null);

  // Stash/clear consent before kicking off any provider. Stale stash from a
  // previous cancelled signup must not leak into a later flow where the user
  // never explicitly consented (e.g. login on a different device).
  const syncConsentStash = useCallback(async () => {
    if (consentAccepted) {
      await stashConsentAccepted();
    } else {
      await clearStashedConsent();
    }
  }, [consentAccepted]);

  const handleApple = useCallback(async () => {
    if (busy) return;
    setBusy('apple');
    try {
      await syncConsentStash();
      if (accountType) {
        await stashPendingAccountType(accountType);
      } else {
        // No role intent in this flow (e.g. login screen) — clear any stash
        // left over by a prior cancelled signup so it can't leak into
        // ProfileBootstrap's role-resolution logic.
        await clearPendingAccountType();
      }

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
      if (getErrorMessage(err) === 'email_already_registered') {
        Alert.alert(t('auth.social.appleErrorTitle'), t('auth.social.emailAlreadyRegistered'));
        return;
      }
      Alert.alert(t('auth.social.appleErrorTitle'), getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, syncConsentStash, t]);

  const handleGoogle = useCallback(async () => {
    if (busy) return;
    if (!ensureGoogleConfigured()) {
      Alert.alert(t('auth.social.googleErrorTitle'), t('auth.social.googleConfigMissing'));
      return;
    }
    setBusy('google');
    try {
      await syncConsentStash();
      if (accountType) {
        await stashPendingAccountType(accountType);
      } else {
        // No role intent in this flow (e.g. login screen) — clear any stash
        // left over by a prior cancelled signup so it can't leak into
        // ProfileBootstrap's role-resolution logic.
        await clearPendingAccountType();
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      const result = (await GoogleSignin.signIn()) as Record<string, unknown>;
      if (result.type === 'cancelled') return;
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
      if (getErrorMessage(err) === 'email_already_registered') {
        Alert.alert(t('auth.social.googleErrorTitle'), t('auth.social.emailAlreadyRegistered'));
        return;
      }
      Alert.alert(t('auth.social.googleErrorTitle'), getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, syncConsentStash, t]);

  const handleYandex = useCallback(async () => {
    if (busy) return;
    if (!YANDEX_CLIENT_ID) {
      Alert.alert(t('auth.social.yandexErrorTitle'), t('auth.social.yandexConfigMissing'));
      return;
    }
    setBusy('yandex');
    try {
      await syncConsentStash();
      if (accountType) {
        await stashPendingAccountType(accountType);
      } else {
        // No role intent in this flow (e.g. login screen) — clear any stash
        // left over by a prior cancelled signup so it can't leak into
        // ProfileBootstrap's role-resolution logic.
        await clearPendingAccountType();
      }

      const result = await authorize(YANDEX_CONFIG);
      if (!result.accessToken) {
        throw new Error('yandex_no_access_token');
      }
      await AuthService.signInWithYandex(result.accessToken);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message === 'email_already_registered') {
        Alert.alert(t('auth.social.yandexErrorTitle'), t('auth.social.emailAlreadyRegistered'));
        return;
      }
      const lower = message.toLowerCase();
      // OIDErrorCodeUserCanceledAuthorizationFlow on iOS surfaces as
      // "org.openid.appauth.general, code -3" with a locale-translated prefix
      // (en: "user cancelled"; ru: "не удалось завершить операцию"). Match
      // both the localized text and the stable OS code so RU/EN both work.
      if (
        lower.includes('cancel') ||
        lower.includes('отмен') ||
        (lower.includes('appauth.general') && lower.includes('-3'))
      ) {
        return;
      }
      const errObj = err as { code?: string };
      // Note: don't pass `err` or its `userInfo` to console.error — native
      // NSError bridges can contain unstringifiable CoreFoundation refs that
      // trip LogBox in dev and produce a confusing RedBox over the real error.
      console.warn(
        `[yandex auth] failed code=${errObj.code ?? 'none'} redirect=${YANDEX_CONFIG.redirectUrl} message=${message.slice(0, 200)}`
      );
      const detail = [
        message,
        errObj.code ? `[${errObj.code}]` : null,
        `redirect_uri: ${YANDEX_CONFIG.redirectUrl}`,
      ]
        .filter(Boolean)
        .join('\n');
      Alert.alert(t('auth.social.yandexErrorTitle'), detail);
    } finally {
      setBusy(null);
    }
  }, [accountType, busy, syncConsentStash, t]);

  return (
    <View style={styles.container}>
      {separatorLabel && (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorLabel}>{separatorLabel}</Text>
          <View style={styles.separatorLine} />
        </View>
      )}

      <View style={[styles.row, disabled && styles.rowDisabled]}>
        <TouchableOpacity
          style={[styles.iconButton, styles.appleButton]}
          onPress={handleApple}
          disabled={busy !== null || disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.appleLabel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {busy === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialCommunityIcons name="apple" size={28} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.googleButton]}
          onPress={handleGoogle}
          disabled={busy !== null || disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.googleLabel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {busy === 'google' ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <MaterialCommunityIcons name="google" size={26} color={COLORS.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.yandexButton]}
          onPress={handleYandex}
          disabled={busy !== null || disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.yandexLabel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
  rowDisabled: {
    opacity: 0.4,
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
