import type { Platform } from './index';

// In-memory StorageAdapter for core unit tests. Backed by a Map so multiple
// callers to the same key see each other's writes, matching AsyncStorage
// semantics (per-process singleton store).
export const createInMemoryStorage = (): { adapter: Platform['storage']; store: Map<string, string> } => {
  const store = new Map<string, string>();
  return {
    store,
    adapter: {
      getItem: async key => store.get(key) ?? null,
      setItem: async (key, value) => {
        store.set(key, value);
      },
      removeItem: async key => {
        store.delete(key);
      },
    },
  };
};

export const createTestPlatform = (
  overrides: Partial<Platform> = {}
): { platform: Platform; storageStore: Map<string, string> } => {
  const { adapter: storage, store: storageStore } = createInMemoryStorage();
  const platform: Platform = {
    storage,
    push: {
      requestPermission: async () => false,
      checkPermission: async () => 'default',
      subscribe: async () => {
        throw new Error('push.subscribe not implemented in test platform');
      },
      unsubscribe: async () => undefined,
      onNotification: () => () => undefined,
      getInitialNotification: async () => null,
      clearAllDelivered: () => undefined,
    },
    geolocation: {
      requestPermission: async () => false,
      getCurrentPosition: async () => null,
    },
    photoPicker: {
      pick: async () => null,
      readAsArrayBuffer: async () => new ArrayBuffer(0),
    },
    localeDetector: { detect: () => null },
    appState: {
      getCurrentState: () => 'active',
      addListener: () => () => undefined,
    },
    alert: { show: () => undefined },
    userAgentTag: 'test/0.0.0',
    ...overrides,
  };
  return { platform, storageStore };
};
