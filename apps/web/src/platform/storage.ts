import { combineChunks, createChunks } from "@supabase/ssr";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import type { StorageAdapter } from "@bystrobarista/core/platform/storage";

// One year — matches supabase-js's own cookie lifetime; the session inside
// rotates far more often, the cookie is just the envelope.
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

// Keys that MUST live in cookies so the middleware / server components can
// read the session: the supabase session itself plus the PKCE code-verifier
// supabase-js stashes next to it during email confirmation flows.
const isSessionKey = (key: string): boolean =>
  key.startsWith(STABLE_STORAGE_KEY);

const readCookie = (name: string): string | null => {
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix))
      return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
};

const writeCookie = (name: string, value: string, maxAgeS: number): void => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeS}; SameSite=Lax${secure}`;
};

const removeCookieChunks = (key: string): void => {
  // Delete the bare cookie and any chunk suffixes (.0, .1, ...) left behind
  // by a previously-larger session payload.
  writeCookie(key, "", 0);
  for (let i = 0; i < 20; i++) {
    if (readCookie(`${key}.${i}`) === null) break;
    writeCookie(`${key}.${i}`, "", 0);
  }
};

const cookieChunkStorage = {
  async getItem(key: string): Promise<string | null> {
    const combined = await combineChunks(key, (name) => readCookie(name));
    return combined ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    removeCookieChunks(key);
    for (const chunk of createChunks(key, value)) {
      writeCookie(chunk.name, chunk.value, COOKIE_MAX_AGE_S);
    }
  },
  async removeItem(key: string): Promise<void> {
    removeCookieChunks(key);
  },
};

// Language preference is mirrored into a small plain cookie so the server can
// pick the right locale during SSR (bb_lang) without parsing localStorage.
const LANG_KEY = "app.language";
export const LANG_COOKIE = "bb_lang";

export const webStorage: StorageAdapter = {
  async getItem(key) {
    if (isSessionKey(key)) return cookieChunkStorage.getItem(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (isSessionKey(key)) return cookieChunkStorage.setItem(key, value);
    try {
      window.localStorage.setItem(key, value);
      if (key === LANG_KEY) writeCookie(LANG_COOKIE, value, COOKIE_MAX_AGE_S);
    } catch {
      // Storage full / private mode — non-fatal, session stays in memory.
    }
  },
  async removeItem(key) {
    if (isSessionKey(key)) return cookieChunkStorage.removeItem(key);
    try {
      window.localStorage.removeItem(key);
      if (key === LANG_KEY) writeCookie(LANG_COOKIE, "", 0);
    } catch {
      // ignore
    }
  },
};
