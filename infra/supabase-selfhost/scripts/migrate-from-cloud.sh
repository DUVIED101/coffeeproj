#!/usr/bin/env bash
# Copy the CLOUD project's database into the self-hosted stack (rehearsal or cutover).
# Runs ON THE SERVER (deploy.sh syncs it there); start it from the laptop with
#
#   ssh bystrobarista-ru /opt/bystrobarista/supabase/scripts/migrate-from-cloud.sh
#
# The dump is taken with the pg_dump 17 inside the supabase-db container over the
# cloud Session pooler (IPv4), mirroring what `supabase db dump` does: roles →
# schema (managed schemas excluded) → data (auth + storage rows included, their
# migration tables excluded), restored with triggers disabled so auth.users rows
# do not re-fire on_auth_user_created. Then sql/post-restore.sql and the Vault
# secrets. Storage FILES are copied separately by copy-storage.mjs.
#
# Needs in /root/bystrobarista-secrets.env: CLOUD_DB_PASSWORD (and optionally
# CLOUD_DB_HOST / CLOUD_DB_USER to override the pooler defaults).

set -euo pipefail
cd "$(dirname "$0")/.."

readonly SECRETS="/root/bystrobarista-secrets.env"
getv() { grep -m1 "^$1=" "$SECRETS" | cut -d= -f2- | tr -d '\r'; }
readonly CLOUD_HOST="${CLOUD_DB_HOST:-$(getv CLOUD_DB_HOST)}"
readonly CLOUD_USER="${CLOUD_DB_USER:-$(getv CLOUD_DB_USER)}"
readonly HOST="${CLOUD_HOST:-aws-0-eu-west-1.pooler.supabase.com}"
readonly USER="${CLOUD_USER:-postgres.zifvfsamfzepxxuxhyhg}"
readonly PASS="$(getv CLOUD_DB_PASSWORD)"
[[ -n "$PASS" ]] || { echo "ERROR: CLOUD_DB_PASSWORD missing in $SECRETS" >&2; exit 1; }

readonly DUMP="backups/cloud-import"
mkdir -p "$DUMP"
log() { printf "[migrate %s] %s\n" "$(date -u +%H:%M:%S)" "$*"; }

# pg_dump / pg_dumpall run inside the db container (Postgres 17, same major as the cloud).
cloud_dump() { docker exec -i -e PGPASSWORD="$PASS" supabase-db "$@"; }
readonly MANAGED_SCHEMAS=(auth storage realtime _realtime supabase_functions supabase_migrations extensions graphql graphql_public net pgsodium pgsodium_masks vault cron pgbouncer _analytics _supavisor pgtle topology tiger tiger_data)
EXCL=(); for s in "${MANAGED_SCHEMAS[@]}"; do EXCL+=(--exclude-schema="$s"); done
# Data: keep the auth tables that carry users and sessions (identical columns on
# both sides, checked 2026-09-08). Storage rows are NOT dumped: the cloud has
# versioning columns the self-hosted storage-api lacks, so copy-storage.mjs
# recreates buckets and objects through the API together with the files. The
# remaining auth tables are empty in the cloud and drift between GoTrue versions.
DATA_EXCL=(); for s in "${MANAGED_SCHEMAS[@]}"; do [[ "$s" == auth ]] && continue; DATA_EXCL+=(--exclude-schema="$s"); done
for t in schema_migrations audit_log_entries custom_oauth_providers instances mfa_challenges mfa_factors oauth_authorizations oauth_client_states oauth_clients oauth_consents saml_providers saml_relay_states sso_domains sso_providers webauthn_challenges webauthn_credentials; do
  DATA_EXCL+=(--exclude-table="auth.$t")
done
DATA_EXCL+=(--exclude-table-data=public.spatial_ref_sys)

log "Dumping roles from $HOST…"
cloud_dump pg_dumpall -h "$HOST" -p 5432 -U "$USER" -l postgres --roles-only --no-role-passwords > "$DUMP/roles.sql"
log "Dumping schema (managed schemas excluded)…"
cloud_dump pg_dump -h "$HOST" -p 5432 -U "$USER" -d postgres --schema-only --no-owner --no-privileges "${EXCL[@]}" > "$DUMP/schema.sql"
log "Dumping data (auth + storage included, triggers will be disabled on restore)…"
cloud_dump pg_dump -h "$HOST" -p 5432 -U "$USER" -d postgres --data-only --no-owner "${DATA_EXCL[@]}" > "$DUMP/data.sql"
ls -la "$DUMP"

log "Sanitising…"
grep -v -E "^(CREATE|ALTER) ROLE \"?(postgres|supabase_admin|supabase_auth_admin|supabase_storage_admin|supabase_functions_admin|supabase_read_only_user|supabase_replication_admin|supabase_realtime_admin|supabase_etl_admin|authenticator|anon|authenticated|service_role|dashboard_user|pgbouncer|pgsodium_keyholder|pgsodium_keyiduser|pgsodium_keymaker)\"?\b" \
  "$DUMP/roles.sql" > "$DUMP/roles.clean.sql" || true
# Event triggers (pgrst_ddl_watch, issue_graphql_placeholder, …) already exist in
# the self-hosted image and need superuser to recreate; the publication too.
awk '
  /^(CREATE|ALTER) EVENT TRIGGER / {skip=1}
  skip { if ($0 ~ /;[[:space:]]*$/) skip=0; next }
  /^(CREATE PUBLICATION "?supabase_realtime|ALTER PUBLICATION "?supabase_realtime"? OWNER|CREATE EXTENSION|COMMENT ON EXTENSION)/ {next}
  {print}
' "$DUMP/schema.sql" > "$DUMP/schema.clean.sql"
wc -l "$DUMP"/*.clean.sql "$DUMP/data.sql"

PSQL="docker exec -i supabase-db psql -U postgres -d postgres"
log "Pre-restore (extensions)…"
$PSQL -q -v ON_ERROR_STOP=1 < sql/pre-restore.sql
log "Roles (errors for pre-existing roles are expected)…"
$PSQL -q < "$DUMP/roles.clean.sql" || true
log "Schema…"
$PSQL -q -v ON_ERROR_STOP=1 --single-transaction < "$DUMP/schema.clean.sql"
log "Data (session_replication_role = replica)…"
( echo "SET session_replication_role = replica;"; cat "$DUMP/data.sql" ) | $PSQL -q -v ON_ERROR_STOP=1 --single-transaction
log "Objects in managed schemas (auth.users triggers, storage policies + grants)…"
scripts/sync-managed-extras.sh
log "Post-restore (publication, cron, analyze)…"
$PSQL -v ON_ERROR_STOP=1 < sql/post-restore.sql
if [[ -f sql/vault-secrets.sql ]]; then
  log "Vault secrets…"
  $PSQL -q -c "DELETE FROM vault.secrets" >/dev/null
  $PSQL -q < sql/vault-secrets.sql >/dev/null
else
  log "WARNING: sql/vault-secrets.sql missing — fill it from sql/vault-secrets.sql.example"
fi
log "Restarting API services so PostgREST/Realtime/Storage reload the schema…"
docker compose restart rest realtime storage auth >/dev/null
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
rm -f "$DUMP"/*.sql
log "DONE. Next: copy the Storage files with copy-storage.mjs from the laptop."
