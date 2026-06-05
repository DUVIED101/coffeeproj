import { Alert } from 'react-native';
import i18next from 'i18next';
import { isAccountBlocked, mapAnyError } from './errorHandler';
import { useAuthStore } from '../stores/authStore';
import { showErrorToast } from '../stores/errorToastStore';

const t = (key: string, opts?: Record<string, unknown>): string => i18next.t(key, opts);

function formatDate(value: string, locale: string): string {
  try {
    return new Date(value).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

/**
 * Unified error sink for write-path Supabase calls.
 *
 * - account_blocked → refresh the user profile so SuspendedUserBanner /
 *   BannedUserBlocker pick up the new state, then show an Alert that
 *   explains the situation. We do NOT raise the generic permission toast
 *   for this case — it's misleading ("insufficient privilege" reads as
 *   client bug, not a moderation outcome).
 * - anything else → fall through to the existing toast pipeline.
 */
export async function handleApiError(error: unknown): Promise<void> {
  if (!isAccountBlocked(error)) {
    showErrorToast(mapAnyError(error));
    return;
  }

  const refreshed = await useAuthStore.getState().refreshUserProfile();
  const lang = i18next.language;

  if (refreshed?.bannedAt) {
    Alert.alert(
      t('account.bannedTitle'),
      refreshed.banReason
        ? `${t('account.bannedBody')}\n\n${t('account.bannedReasonLabel')}: ${refreshed.banReason}`
        : t('account.bannedBody')
    );
    return;
  }

  if (refreshed?.suspendedUntil) {
    Alert.alert(
      t('account.blockedActionTitle'),
      t('account.blockedActionBody', {
        date: formatDate(refreshed.suspendedUntil, lang),
      })
    );
    return;
  }

  // Profile refresh didn't see the suspension yet (e.g. replication lag).
  // Fall back to a generic restricted message rather than the misleading
  // "insufficient privilege" toast.
  Alert.alert(t('account.blockedActionTitle'), t('account.blockedActionGeneric'));
}
