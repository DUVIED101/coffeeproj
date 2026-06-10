import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DIRECT_URL,
  FORCE_PROXY_STORAGE_KEY,
  isRussianTimezone,
  PROXY_URL,
  pickSupabaseHost,
  pickSupabaseHostSync,
  RU_TIMEZONES,
  STABLE_STORAGE_KEY,
} from './supabaseHost';

// react-native-dotenv inlines @env values at babel-time, so jest.mock('@env')
// in jest.setup.js is dead for inlined imports. Spec reads the real exports
// off the module instead of hard-coding URLs (per memory: feedback_i18n_reload
// pattern).
const DIRECT = DIRECT_URL;
const PROXY = PROXY_URL as string;

describe('STABLE_STORAGE_KEY', () => {
  it('is decoupled from supabase project ref so swapping URL keeps the session', () => {
    expect(STABLE_STORAGE_KEY).toBe('sb-bystrobarista-auth-token');
  });
});

describe('isRussianTimezone', () => {
  it('returns true for the canonical Russian IANA timezones', () => {
    expect(isRussianTimezone('Europe/Moscow')).toBe(true);
    expect(isRussianTimezone('Asia/Vladivostok')).toBe(true);
    expect(isRussianTimezone('Asia/Kamchatka')).toBe(true);
  });

  it('returns false for non-Russian timezones', () => {
    expect(isRussianTimezone('America/Los_Angeles')).toBe(false);
    expect(isRussianTimezone('Europe/Berlin')).toBe(false);
    expect(isRussianTimezone('Asia/Tokyo')).toBe(false);
  });

  it('returns false for null, undefined, or unknown input (fail-safe)', () => {
    expect(isRussianTimezone(null)).toBe(false);
    expect(isRussianTimezone(undefined)).toBe(false);
    expect(isRussianTimezone('')).toBe(false);
    expect(isRussianTimezone('Not/A/Zone')).toBe(false);
  });

  it('covers all 11 Russian time-zone bands (at least one IANA name each)', () => {
    // Sanity: catches accidental deletions from the RU_TIMEZONES set.
    expect(RU_TIMEZONES.size).toBeGreaterThanOrEqual(25);
  });
});

describe('pickSupabaseHostSync', () => {
  it('returns direct URL when timezone is non-Russian', () => {
    expect(pickSupabaseHostSync({ timezone: 'America/Los_Angeles' })).toEqual({
      url: DIRECT,
      useProxy: false,
      reason: 'default',
    });
  });

  it('returns proxy URL when timezone is a Russian IANA name', () => {
    expect(pickSupabaseHostSync({ timezone: 'Europe/Moscow' })).toEqual({
      url: PROXY,
      useProxy: true,
      reason: 'tz',
    });
  });

  it('falls back to direct URL when timezone is null (fail-safe — no false-positive proxy)', () => {
    expect(pickSupabaseHostSync({ timezone: null })).toEqual({
      url: DIRECT,
      useProxy: false,
      reason: 'default',
    });
  });
});

describe('pickSupabaseHost (async — includes Force-proxy override)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns direct URL by default (non-Russian TZ, no override)', async () => {
    const choice = await pickSupabaseHost({ timezone: 'America/Los_Angeles' });
    expect(choice).toEqual({ url: DIRECT, useProxy: false, reason: 'default' });
  });

  it('returns proxy URL when timezone is Russian', async () => {
    const choice = await pickSupabaseHost({ timezone: 'Asia/Yekaterinburg' });
    expect(choice).toEqual({ url: PROXY, useProxy: true, reason: 'tz' });
  });

  it('Force-proxy override beats non-Russian TZ', async () => {
    await AsyncStorage.setItem(FORCE_PROXY_STORAGE_KEY, 'true');
    const choice = await pickSupabaseHost({ timezone: 'America/Los_Angeles' });
    expect(choice).toEqual({ url: PROXY, useProxy: true, reason: 'forced' });
  });

  it('ignores a Force-proxy value that is not the literal string "true"', async () => {
    await AsyncStorage.setItem(FORCE_PROXY_STORAGE_KEY, '1');
    const choice = await pickSupabaseHost({ timezone: 'America/Los_Angeles' });
    expect(choice.useProxy).toBe(false);
  });
});
