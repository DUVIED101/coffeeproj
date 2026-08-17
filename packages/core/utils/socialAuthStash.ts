import type { AccountType } from '../types';
import { getPlatform } from '../platform';

const KEY = '@quickbarista/pending-account-type';

export const stashPendingAccountType = async (accountType: AccountType): Promise<void> => {
  await getPlatform().storage.setItem(KEY, accountType);
};

export const readPendingAccountType = async (): Promise<AccountType | null> => {
  const value = await getPlatform().storage.getItem(KEY);
  if (value === 'barista' || value === 'business') return value;
  return null;
};

export const clearPendingAccountType = async (): Promise<void> => {
  await getPlatform().storage.removeItem(KEY);
};
