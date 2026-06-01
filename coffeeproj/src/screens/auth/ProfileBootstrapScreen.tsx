import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../config/constants';
import { readPendingAccountType, clearPendingAccountType } from '../../utils/socialAuthStash';
import type { AccountType, User } from '../../types';

type SignupMetadata = {
  account_type?: string;
};

export const ProfileBootstrapScreen: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(true);

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
        .select('account_type, account_type_set_explicitly')
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
          const { error: updateError } = await supabase
            .from('users')
            .update({
              account_type: finalRole,
              account_type_set_explicitly: true,
            })
            .eq('id', session.user.id);
          if (updateError) throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from('users').insert({
          id: session.user.id,
          email: session.user.email ?? '',
          account_type: desiredAccountType,
          account_type_set_explicitly: true,
        });
        if (insertError) throw new Error(insertError.message);
      }
      await clearPendingAccountType();

      const { data, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (selectError || !data) {
        throw new Error(selectError?.message ?? 'Profile row still missing after upsert.');
      }

      const profile: User = {
        id: data.id,
        uid: data.id,
        email: data.email,
        accountType: data.account_type,
        isActive: data.is_active,
        isVerified: data.is_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      useAuthStore.getState().setUser(profile);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error('ProfileBootstrap failed:', message);
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }, []);

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

  if (isWorking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>{t('auth.profileBootstrap.working')}</Text>
      </View>
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 160,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
