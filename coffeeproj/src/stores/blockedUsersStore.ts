import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Client-side block list. Backend-side blocking (Supabase RLS) is a follow-up;
// for App Store Guideline 1.2 the user-visible behavior — hidden conversations
// and a "Blocked users" management screen — is what Apple reviews.
const STORAGE_KEY = '@bystrobarista/blocked-users';

type BlockedEntry = {
  userId: string;
  displayName: string;
  blockedAt: string;
};

type BlockedUsersState = {
  blocked: BlockedEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  block: (userId: string, displayName: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;
  reset: () => Promise<void>;
};

export const useBlockedUsersStore = create<BlockedUsersState>((set, get) => ({
  blocked: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: BlockedEntry[] = raw ? JSON.parse(raw) : [];
      set({ blocked: parsed, hydrated: true });
    } catch (err) {
      console.error('blockedUsersStore.hydrate failed:', err);
      set({ hydrated: true });
    }
  },

  block: async (userId, displayName) => {
    const next = [
      ...get().blocked.filter(b => b.userId !== userId),
      { userId, displayName, blockedAt: new Date().toISOString() },
    ];
    set({ blocked: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('blockedUsersStore.block persist failed:', err);
    }
  },

  unblock: async userId => {
    const next = get().blocked.filter(b => b.userId !== userId);
    set({ blocked: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('blockedUsersStore.unblock persist failed:', err);
    }
  },

  isBlocked: userId => get().blocked.some(b => b.userId === userId),

  reset: async () => {
    set({ blocked: [], hydrated: true });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('blockedUsersStore.reset failed:', err);
    }
  },
}));
