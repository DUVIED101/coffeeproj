import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  _resetPlatformForTests,
  getPlatform,
  setPlatform,
  type Platform,
} from './index';

const fakePlatform: Platform = {
  storage: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
  push: {
    requestPermission: async () => false,
    checkPermission: async () => 'default',
    subscribe: async () => {
      throw new Error('not used');
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
};

describe('platform registry', () => {
  beforeEach(() => {
    _resetPlatformForTests();
  });

  it('throws before setPlatform is called', () => {
    expect(() => getPlatform()).toThrow('Platform not initialized');
  });

  it('returns the injected platform after setPlatform', () => {
    setPlatform(fakePlatform);
    expect(getPlatform()).toBe(fakePlatform);
  });

  it('overwrites the previous platform on repeated setPlatform', () => {
    setPlatform(fakePlatform);
    const other: Platform = { ...fakePlatform, userAgentTag: 'test/other' };
    setPlatform(other);
    expect(getPlatform().userAgentTag).toBe('test/other');
  });
});
