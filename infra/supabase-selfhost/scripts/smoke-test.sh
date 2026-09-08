#!/usr/bin/env bash
# End-to-end reachability check of a self-hosted Supabase host.
#   SUPABASE_ANON_KEY=... bash infra/supabase-selfhost/scripts/smoke-test.sh [https://api.bystrobarista.com]

set -uo pipefail
readonly BASE="${1:-https://api.bystrobarista.com}"
: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
fail=0
check() {
  local label="$1" want="$2" got="$3"
  if [[ "$got" == "$want" ]]; then printf "  ok   %-34s %s\n" "$label" "$got"; else printf "  FAIL %-34s got %s, want %s\n" "$label" "$got" "$want"; fail=1; fi
}
code() { curl -sS --http1.1 -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }

echo "Smoke test against $BASE"
check "auth health"      200 "$(code "$BASE/auth/v1/health" -H "apikey: $SUPABASE_ANON_KEY")"
check "jwks has ES256"   yes "$(curl -sS --max-time 15 "$BASE/auth/v1/.well-known/jwks.json" | grep -q '"ES256"' && echo yes || echo no)"
check "rest jobs"        200 "$(code "$BASE/rest/v1/jobs?select=id&limit=1" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY")"
check "rest search_jobs rpc" 200 "$(code -X POST "$BASE/rest/v1/rpc/search_jobs" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{}' )"
check "storage status"   200 "$(code "$BASE/storage/v1/bucket" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY")"
pre="$(code -X OPTIONS "$BASE/functions/v1/delete-user" -H 'Origin: https://app.bystrobarista.com' -H 'Access-Control-Request-Method: POST')"; [[ "$pre" == 200 ]] && pre=204
check "functions preflight" 204 "$pre"
check "realtime ws upgrade" 101 "$(code "$BASE/realtime/v1/websocket?apikey=$SUPABASE_ANON_KEY&vsn=1.0.0" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: c2Fsb2NrIHNhbG9jayBzYWw=' )"
check "studio hidden"    000 "$(code "$BASE/")"
check "http redirect"    301 "$(code "${BASE/https:/http:}/auth/v1/health")"
[[ $fail -eq 0 ]] && echo "ALL OK" || { echo "FAILURES"; exit 1; }
