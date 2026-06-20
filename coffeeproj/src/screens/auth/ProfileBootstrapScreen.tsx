import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../config/constants';
import { readPendingAccountType, clearPendingAccountType } from '../../utils/socialAuthStash';
import { consumeStashedConsent } from '../../utils/consentStash';
import {
  getOutstandingLegalAcceptances,
  recordCurrentLegalAcceptances,
} from '../../services/LegalAcceptanceService';
import type { LegalDocumentKind } from '../../config/legalVersions';
import type { BootstrapStackParamList } from '../../navigation/BootstrapStack';
import type { AccountType, User } from '../../types';
import type { UserId } from '../../types/ids';

type SignupMetadata = {
  account_type?: string;
};

type ProfileRow = {
  id: string;
  email: string;
  account_type: AccountType;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  suspended_until: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  consent_accepted_at: string | null;
};

type BootstrapNav = NativeStackNavigationProp<BootstrapStackParamList, 'Bootstrap'>;

const toUser = (row: ProfileRow): User => ({
  id: row.id,
  uid: row.id,
  email: row.email,
  accountType: row.account_type,
  isActive: row.is_active,
  isVerified: row.is_verified,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  suspendedUntil: row.suspended_until ?? null,
  bannedAt: row.banned_at ?? null,
  banReason: row.ban_reason ?? null,
  consentAcceptedAt: row.consent_accepted_at ?? null,
});

export const ProfileBootstrapScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<BootstrapNav>();
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(true);
  // When the bootstrap path completes but consent_accepted_at is still null,
  // we hold the profile aside and ask the user to consent before we hand it
  // off to MainTabs via setUser.
  const [pendingProfile, setPendingProfile] = useState<User | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDataConsent, setAcceptedDataConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [isAcceptingConsent, setIsAcceptingConsent] = useState(false);

  const attempt = useCallback(async () => {
    setError(null);
    setIsWorking(true);
    try {
      const session = useAuthStore.getState().session;
      if (!session?.user) {
        throw new Error('No active session.');
      }

      const meta = (session.user.user_metadata ?? {}) as SignupMetadata;
      const pendingAccountType = await readPendingAccountType();
      // Email/password signup screen sets this stash before calling signUp;
      // OAuth signup flow only sets it when the SocialAuthButtons sees that
      // the parent screen has already collected consent inline (SignupScreen).
      // Anything else lands at the consent gate below.
      const stashedConsent = await consumeStashedConsent();
      const desiredAccountType: AccountType =
        meta.account_type === 'business' || meta.account_type === 'barista'
          ? (meta.account_type as AccountType)
          : (pendingAccountType ?? 'barista');

      // Strict one-email-one-role enforcement. handle_new_user pre-inserts a
      // public.users row with account_type='barista' for OAuth users (their
      // raw_user_meta_data has no account_type) and leaves
      // account_type_set_explicitly=false. The very first ProfileBootstrap run
      // writes the user's intended role and flips the flag to true; from then
      // on a DB trigger (migration 070) refuses any further account_type
      // change, so a returning user cannot bounce between barista and business
      // by signing out and back in with a different stashed pendingAccountType.
      const { data: existing, error: existingErr } = await supabase
        .from('users')
        .select('account_type, account_type_set_explicitly, consent_accepted_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (existingErr) throw new Error(existingErr.message);

      if (existing) {
        const stored = existing.account_type as AccountType | null;
        const lockedExplicitly = existing.account_type_set_explicitly === true;

        if (lockedExplicitly) {
          if (stored && pendingAccountType && stored !== pendingAccountType) {
            await clearPendingAccountType();
            await supabase.auth.signOut();
            throw new Error('email_already_registered_different_role');
          }
        } else {
          const finalRole: AccountType = pendingAccountType ?? stored ?? desiredAccountType;
          const update: Record<string, unknown> = {
            account_type: finalRole,
            account_type_set_explicitly: true,
          };
          if (stashedConsent && !existing.consent_accepted_at) {
            update.consent_accepted_at = new Date().toISOString();
          }
          const { error: updateError } = await supabase
            .from('users')
            .update(update)
            .eq('id', session.user.id);
          if (updateError) throw new Error(updateError.message);
        }

        // Returning user with consent stash (rare: e.g. they tapped Accept on
        // signup, abandoned, came back to login with same email). Honour it.
        if (stashedConsent && existing.consent_accepted_at == null && lockedExplicitly) {
          const { error: updErr } = await supabase
            .from('users')
            .update({ consent_accepted_at: new Date().toISOString() })
            .eq('id', session.user.id);
          if (updErr) throw new Error(updErr.message);
        }
      } else {
        const insertPayload: Record<string, unknown> = {
          id: session.user.id,
          email: session.user.email ?? '',
          account_type: desiredAccountType,
          account_type_set_explicitly: true,
        };
        if (stashedConsent) {
          insertPayload.consent_accepted_at = new Date().toISOString();
        }
        const { error: insertError } = await supabase.from('users').insert(insertPayload);
        if (insertError) throw new Error(insertError.message);
      }
      await clearPendingAccountType();

      const { data, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single<ProfileRow>();

      if (selectError || !data) {
        throw new Error(selectError?.message ?? 'Profile row still missing after upsert.');
      }

      const profile = toUser(data);

      // If the user just walked through the in-app consent UI (stashed flag),
      // append the per-document audit log immediately. Best-effort — we don't
      // want a transient network error here to block sign-in, the gate below
      // will catch a missing acceptance on the next session.
      if (stashedConsent) {
        try {
          await recordCurrentLegalAcceptances(profile.id as UserId);
        } catch (logErr) {
          console.warn('recordCurrentLegalAcceptances failed during bootstrap:', logErr);
        }
      }

      // Two gates on top of consent_accepted_at:
      //   1. No consent ever recorded → first-time consent screen.
      //   2. Consent recorded, but at least one document has a newer version
      //      than what the user previously accepted → re-consent screen.
      let outstanding: LegalDocumentKind[] = [];
      try {
        outstanding = await getOutstandingLegalAcceptances(profile.id as UserId);
      } catch (outstandingErr) {
        console.warn('getOutstandingLegalAcceptances failed:', outstandingErr);
      }

      if (!profile.consentAcceptedAt || outstanding.length > 0) {
        // Stash everything to the consent gate; we'll setUser only once the
        // gate writes consent_accepted_at and we re-fetch.
        setPendingProfile(profile);
      } else {
        useAuthStore.getState().setUser(profile);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      if (message === 'email_already_registered_different_role') {
        Alert.alert(
          t('auth.profileBootstrap.failedTitle'),
          t('auth.profileBootstrap.differentRole')
        );
      } else {
        console.error('ProfileBootstrap failed:', message);
      }
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }, [t]);

  useEffect(() => {
    void attempt();
  }, [attempt]);

  const handleSignOut = useCallback(async () => {
    try {
      await useAuthStore.getState().signOut();
    } catch (e) {
      console.error('Sign out from bootstrap failed:', e);
    }
  }, []);

  const handleAcceptConsent = useCallback(async () => {
    if (!acceptedTerms || !acceptedDataConsent) {
      setConsentError(t('auth.signup.consent.errorTermsRequired'));
      return;
    }
    if (!pendingProfile) return;
    setIsAcceptingConsent(true);
    setConsentError(null);
    try {
      const { error: updErr } = await supabase
        .from('users')
        .update({ consent_accepted_at: new Date().toISOString() })
        .eq('id', pendingProfile.id);
      if (updErr) throw new Error(updErr.message);

      // Per-document audit trail — failure here means we'd re-prompt the user
      // on next session, which is preferable to losing the (now-set) flag.
      await recordCurrentLegalAcceptances(pendingProfile.id as UserId);

      const { data, error: selErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', pendingProfile.id)
        .single<ProfileRow>();
      if (selErr || !data) {
        throw new Error(selErr?.message ?? 'Failed to re-fetch profile after consent.');
      }
      useAuthStore.getState().setUser(toUser(data));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error('Consent acceptance failed:', message);
      setConsentError(message);
    } finally {
      setIsAcceptingConsent(false);
    }
  }, [acceptedTerms, acceptedDataConsent, pendingProfile, t]);

  if (isWorking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>{t('auth.profileBootstrap.working')}</Text>
      </View>
    );
  }

  if (pendingProfile) {
    return (
      <SafeAreaView style={styles.consentSafeArea}>
        <ScrollView
          style={styles.consentScroll}
          contentContainerStyle={styles.consentContent}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.consentTitle}>{t('auth.profileBootstrap.consentTitle')}</Text>
          <Text style={styles.consentBody}>{t('auth.profileBootstrap.consentBody')}</Text>

          <Text style={styles.consentIntro}>{t('auth.signup.consent.intro')}</Text>

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => {
              setAcceptedTerms(v => !v);
              setConsentError(null);
            }}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}>
            <View style={[styles.checkbox, acceptedTerms ? styles.checkboxChecked : null]}>
              {acceptedTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.consentLabel}>
              {t('auth.signup.consent.termsPrivacyPrefix')}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('Terms')}>
                {t('auth.signup.consent.termsLink')}
              </Text>
              {t('auth.signup.consent.termsPrivacyAnd')}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                {t('auth.signup.consent.privacyLink')}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => {
              setAcceptedDataConsent(v => !v);
              setConsentError(null);
            }}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedDataConsent }}>
            <View style={[styles.checkbox, acceptedDataConsent ? styles.checkboxChecked : null]}>
              {acceptedDataConsent && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.consentLabel}>
              {t('auth.signup.consent.dataProcessingPrefix')}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('DataConsent')}>
                {t('auth.signup.consent.dataProcessingLink')}
              </Text>
            </Text>
          </TouchableOpacity>

          {consentError && <Text style={styles.errorText}>{consentError}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, isAcceptingConsent && styles.primaryButtonDisabled]}
            onPress={handleAcceptConsent}
            disabled={isAcceptingConsent}
            activeOpacity={0.85}>
            {isAcceptingConsent ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.profileBootstrap.consentAccept')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignOut}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{t('auth.profileBootstrap.signOut')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isRoleConflict = error === 'email_already_registered_different_role';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.profileBootstrap.failedTitle')}</Text>
      <Text style={styles.errorText}>
        {isRoleConflict ? t('auth.profileBootstrap.differentRole') : error}
      </Text>
      {!isRoleConflict && (
        <TouchableOpacity style={styles.primaryButton} onPress={attempt} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>{t('auth.profileBootstrap.retry')}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.secondaryButtonText}>{t('auth.profileBootstrap.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  consentSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  consentScroll: {
    flex: 1,
  },
  consentContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  consentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  consentBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  consentIntro: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxMark: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  consentLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  consentLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});
