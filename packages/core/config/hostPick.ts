// IANA zone names for every Russian time band (Europe/* west of Urals,
// Asia/* east). Kept as a Set for O(1) lookup. Aliases like Europe/Volgograd
// and Asia/Khandyga are included so devices on older tzdata still match.
export const RU_TIMEZONES: ReadonlySet<string> = new Set<string>([
  'Europe/Astrakhan',
  'Europe/Kaliningrad',
  'Europe/Kirov',
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Saratov',
  'Europe/Simferopol',
  'Europe/Ulyanovsk',
  'Europe/Volgograd',
  'Asia/Anadyr',
  'Asia/Barnaul',
  'Asia/Chita',
  'Asia/Irkutsk',
  'Asia/Kamchatka',
  'Asia/Khandyga',
  'Asia/Krasnoyarsk',
  'Asia/Magadan',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Sakhalin',
  'Asia/Srednekolymsk',
  'Asia/Tomsk',
  'Asia/Ust-Nera',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yekaterinburg',
]);

export function isRussianTimezone(tz: string | null | undefined): boolean {
  return typeof tz === 'string' && RU_TIMEZONES.has(tz);
}

export function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export type HostChoiceReason = 'forced' | 'tz' | 'default';

export type HostChoice = {
  url: string;
  useProxy: boolean;
  reason: HostChoiceReason;
};

export type HostPickInput = {
  directUrl: string;
  proxyUrl: string | undefined;
  timezone: string | null | undefined;
};

// Pure host pick shared by mobile (Hermes) and web (browsers). Russian ISPs
// block direct Supabase (Cloudflare-fronted), so RU-looking clients get the
// bystrobarista proxy. The unreliable-TZ fallbacks intentionally err toward
// the proxy: a false-positive costs non-RU users ~100ms per request, a
// false-negative bricks the app entirely for RU users.
export function computeHostChoice({ directUrl, proxyUrl, timezone }: HostPickInput): HostChoice {
  if (!proxyUrl) return { url: directUrl, useProxy: false, reason: 'default' };
  if (isRussianTimezone(timezone)) return { url: proxyUrl, useProxy: true, reason: 'tz' };
  // Hermes' Intl polyfill on iOS (and some privacy-hardened browsers) can
  // report null/'UTC' before Intl settles. Treat unreliable TZ as "probably
  // Russian".
  if (!timezone || timezone === 'UTC') return { url: proxyUrl, useProxy: true, reason: 'tz' };
  // Offset-based fallback for devices that report a non-canonical TZ name
  // (legacy aliases like 'W-SU', or 'GMT+3' on some Hermes builds) but sit in
  // the Russian UTC offset band (Moscow UTC+3 → Kamchatka UTC+12).
  // getTimezoneOffset returns minutes WEST of UTC, so RU offsets are negative.
  const offsetMinutes = new Date().getTimezoneOffset();
  if (offsetMinutes <= -120 && offsetMinutes >= -720) {
    return { url: proxyUrl, useProxy: true, reason: 'tz' };
  }
  return { url: directUrl, useProxy: false, reason: 'default' };
}
