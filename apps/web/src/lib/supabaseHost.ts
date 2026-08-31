import {
  computeHostChoice,
  getDeviceTimezone,
  type HostChoice,
} from "@bystrobarista/core/config/hostPick";

export const DIRECT_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const PROXY_URL: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL || undefined;

// Browser-side host pick, mirroring mobile: RU-timezone clients route through
// the bystrobarista proxy because Russian ISPs block direct Supabase. Cached
// forever per page-load so the client and any diagnostics agree on the URL.
let _cached: HostChoice | null = null;

export function pickBrowserSupabaseHost(): HostChoice {
  if (_cached) return _cached;
  _cached = computeHostChoice({
    directUrl: DIRECT_URL,
    proxyUrl: PROXY_URL,
    timezone: getDeviceTimezone(),
  });
  return _cached;
}
