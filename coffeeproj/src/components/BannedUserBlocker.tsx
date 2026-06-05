import React, { memo, useCallback } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { useAuthStore } from '../stores/authStore';

/**
 * Full-screen blocking modal shown while the user is banned. Sign-out is the
 * only action — the user has nothing to do in the app, and RLS rejects any
 * write they'd try anyway.
 */
export const BannedUserBlocker: React.FC = memo(() => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  if (!user?.bannedAt) return null;

  return (
    <Modal visible animationType="fade" transparent={false}>
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('account.bannedTitle')}</Text>
          <Text style={styles.body}>{t('account.bannedBody')}</Text>
          {user.banReason && (
            <View style={styles.reasonBlock}>
              <Text style={styles.reasonLabel}>{t('account.bannedReasonLabel')}:</Text>
              <Text style={styles.reasonText}>{user.banReason}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleSignOut} style={styles.button}>
            <Text style={styles.buttonText}>{t('account.bannedSignOut')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

BannedUserBlocker.displayName = 'BannedUserBlocker';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
  },
  reasonBlock: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
