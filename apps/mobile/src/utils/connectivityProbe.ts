import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';
import { PROXY_URL } from '../config/supabaseHost';
import { withTimeout } from './withTimeout';

export const LAST_PROBE_STORAGE_KEY = 'diagnostics.lastProbe';

export type ProbeTargetId = 'supabase' | 'supabaseProxy' | 'yandex' | 'apple';

export interface ProbeResult {
  target: ProbeTargetId;
  url: string;
  ok: boolean;
  status?: number;
  durationMs: number;
  errorName?: string;
  errorMessage?: string;
}

export interface ConnectivityReport {
  startedAt: string;
  finishedAt: string;
  results: ProbeResult[];
  supabaseReachable: boolean;
  supabaseProxyReachable: boolean;
  yandexReachable: boolean;
  appleReachable: boolean;
}

interface ProbeTarget {
  id: ProbeTargetId;
  url: string;
  headers?: Record<string, string>;
}

function buildTargets(): ProbeTarget[] {
  const list: ProbeTarget[] = [
    {
      id: 'supabase',
      // GoTrue's /auth/v1/health responds 200 with apikey, 401 without. We send
      // the anon key so a healthy server returns 200. Even without it, any
      // response < 500 proves we reached Supabase (TLS + routing OK).
      url: `${SUPABASE_URL}/auth/v1/health`,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    },
  ];
  if (PROXY_URL) {
    list.push({
      id: 'supabaseProxy',
      url: `${PROXY_URL}/auth/v1/health`,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
  }
  list.push(
    { id: 'yandex', url: 'https://yandex.ru/favicon.ico' },
    { id: 'apple', url: 'https://www.apple.com/library/test/success.html' }
  );
  return list;
}

// The probe asks "can the device reach this host?", not "is auth correct?".
// Any HTTP response below 500 means TCP/TLS/DNS all worked and the server
// replied — that's reachable. Only network errors, timeouts, and 5xx count
// as unreachable.
const isReachableStatus = (status: number): boolean => status < 500;

async function probe(
  target: ProbeTarget,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<ProbeResult> {
  const startedAt = Date.now();
  try {
    const res = await withTimeout(
      fetchImpl(target.url, { method: 'GET', cache: 'no-store', headers: target.headers }),
      timeoutMs,
      target.id
    );
    return {
      target: target.id,
      url: target.url,
      ok: isReachableStatus(res.status),
      status: res.status,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const e = error as { name?: string; message?: string };
    return {
      target: target.id,
      url: target.url,
      ok: false,
      durationMs: Date.now() - startedAt,
      errorName: typeof e?.name === 'string' ? e.name : undefined,
      errorMessage: typeof e?.message === 'string' ? e.message : String(error),
    };
  }
}

export async function runConnectivityProbe(opts?: {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<ConnectivityReport> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const targets = buildTargets();
  const startedAt = new Date().toISOString();
  const results = await Promise.all(targets.map(t => probe(t, timeoutMs, fetchImpl)));
  const finishedAt = new Date().toISOString();
  const findReachable = (id: ProbeTargetId): boolean =>
    results.find(r => r.target === id)?.ok ?? false;
  const report: ConnectivityReport = {
    startedAt,
    finishedAt,
    results,
    supabaseReachable: findReachable('supabase'),
    supabaseProxyReachable: findReachable('supabaseProxy'),
    yandexReachable: findReachable('yandex'),
    appleReachable: findReachable('apple'),
  };
  try {
    await AsyncStorage.setItem(LAST_PROBE_STORAGE_KEY, JSON.stringify(report));
  } catch {
    // non-fatal
  }
  return report;
}

export async function loadLastReport(): Promise<ConnectivityReport | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PROBE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectivityReport;
  } catch {
    return null;
  }
}
