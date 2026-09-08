#!/usr/bin/env bash
# Copy the objects that live in Supabase-managed schemas and therefore are not
# part of the schema dump, straight from the cloud project into the local DB:
#   - triggers on auth.users (on_auth_user_email_confirmed)
#   - RLS policies on storage.objects / storage.buckets (migrations 019, 024, 042)
#   - grants on storage.objects / storage.buckets for anon / authenticated / service_role
# Runs on the server; migrate-from-cloud.sh calls it, and it is safe to re-run.

set -euo pipefail
cd "$(dirname "$0")/.."

readonly SECRETS="/root/bystrobarista-secrets.env"
getv() { grep -m1 "^$1=" "$SECRETS" | cut -d= -f2- | tr -d '\r'; }
readonly HOST="${CLOUD_DB_HOST:-$(getv CLOUD_DB_HOST)}"
readonly USER="${CLOUD_DB_USER:-$(getv CLOUD_DB_USER)}"
readonly PASS="$(getv CLOUD_DB_PASSWORD)"
readonly CLOUD_HOST="${HOST:-aws-1-eu-west-1.pooler.supabase.com}"
readonly CLOUD_USER="${USER:-postgres.zifvfsamfzepxxuxhyhg}"
log() { printf "[extras %s] %s\n" "$(date -u +%H:%M:%S)" "$*"; }

readonly OUT="backups/cloud-import/managed-extras.sql"
mkdir -p "$(dirname "$OUT")"

log "Reading triggers, policies and grants from the cloud…"
docker exec -i -e PGPASSWORD="$PASS" supabase-db psql -h "$CLOUD_HOST" -p 5432 -U "$CLOUD_USER" -d postgres -At -v ON_ERROR_STOP=1 > "$OUT" <<'SQL'
select 'DROP TRIGGER IF EXISTS '||quote_ident(t.tgname)||' ON auth.users; '||pg_get_triggerdef(t.oid)||';'
  from pg_trigger t where t.tgrelid='auth.users'::regclass and not t.tgisinternal
union all
select format('DROP POLICY IF EXISTS %I ON %I.%I; CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
              policyname, schemaname, tablename, policyname, schemaname, tablename, permissive, cmd,
              array_to_string(roles, ', '), coalesce(' USING ('||qual||')',''), coalesce(' WITH CHECK ('||with_check||')',''))
  from pg_policies where schemaname='storage' and tablename in ('objects','buckets')
union all
select format('GRANT %s ON %I.%I TO %I;', string_agg(privilege_type, ', '), table_schema, table_name, grantee)
  from information_schema.role_table_grants
  where table_schema='storage' and table_name in ('objects','buckets') and grantee in ('anon','authenticated','service_role')
  group by table_schema, table_name, grantee;
SQL
log "$(grep -c 'CREATE POLICY' "$OUT") policies, $(grep -c 'CREATE TRIGGER' "$OUT") triggers, $(grep -c '^GRANT' "$OUT") grants"

log "Applying locally…"
docker exec -i supabase-db psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 < "$OUT"
docker exec -i supabase-db psql -U postgres -d postgres -Atc "select 'auth.users triggers='||(select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal)||', storage.objects policies='||(select count(*) from pg_policies where schemaname='storage' and tablename='objects')"
rm -f "$OUT"
log "DONE"
