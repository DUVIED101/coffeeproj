import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@bystrobarista/core/platform/storage';

export const nativeStorage: StorageAdapter = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};
