import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccountType } from '../types';

const KEY = '@quickbarista/pending-account-type';

export const stashPendingAccountType = async (accountType: AccountType): Promise<void> => {
  await AsyncStorage.setItem(KEY, accountType);
};

export const readPendingAccountType = async (): Promise<AccountType | null> => {
  const value = await AsyncStorage.getItem(KEY);
  if (value === 'barista' || value === 'business') return value;
  return null;
};

export const clearPendingAccountType = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
