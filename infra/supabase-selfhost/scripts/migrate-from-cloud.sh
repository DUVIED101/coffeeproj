#!/usr/bin/env bash
# Copy the CLOUD project's database into the self-hosted stack (rehearsal or cutover).
# Run from your laptop. Follows the official "Transferring from platform to
# self-hosted" guide: roles → schema → data, with triggers disabled during the
# data load so auth.users rows do not re-fire on_auth_user_created.
#
#   CLOUD_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
#     bash infra/supabase-selfhost/scripts/migrate-from-cloud.sh [ssh-host]
#
# Prerequisites: supabase CLI locally; the remote stack is up (`deploy.sh`)
# and its sql/vault-secrets.sql is filled in. Storage FILES are copied
# separately by copy-storage.mjs.

set -euo pipefail

readonly HOST="${1:-bystrobarista-ru}"
readonly REMOTE_DIR="/opt/bystrobarista/supabase"
: "${CLOUD_DB_URL:?set CLOUD_DB_URL (Dashboard → Connect → Session pooler URI)}"

log() { printf "[migrate] %s\n" "$*"; }
DUMP="$(mktemp -d)"
trap 'rm -rf "$DUMP"' EXIT

log "Dumping cloud roles / schema / data into ${DUMP}…"
supabase db dump --db-url "$CLOUD_DB_URL" -f "$DUMP/roles.sql" --role-only
supabase db dump --db-url "$CLOUD_DB_URL" -f "$DUMP/schema.sql"
supabase db dump --db-url "$CLOUD_DB_URL" -f "$DUMP/data.sql" --use-copy --data-only

log "Sanitising dumps…"
# Keep the self-hosted passwords of the built-in roles; keep only custom roles.
grep -v -E "^(CREATE|ALTER) ROLE \"?(postgres|supabase_admin|supabase_auth_admin|supabase_storage_admin|supabase_functions_admin|supabase_read_only_user|supabase_replication_admin|authenticator|anon|authenticated|service_role|dashboard_user|pgbouncer|pgsodium_keyholder|pgsodium_keyiduser|pgsodium_keymaker)\"?\b" \
  "$DUMP/roles.sql" > "$DUMP/roles.clean.sql" || true
# The self-hosted init already owns the realtime publication (post-restore.sql pins its tables).
grep -v -E "^(CREATE PUBLICATION \"?supabase_realtime|ALTER PUBLICATION \"?supabase_realtime\"? OWNER)" \
  "$DUMP/schema.sql" > "$DUMP/schema.clean.sql"
# Service-owned migration tables must stay as the containers created them.
awk '
  /^COPY (auth\.schema_migrations|storage\.migrations|supabase_migrations\.schema_migrations) / {skip=1}
  skip && /^\\\.$/ {skip=0; next}
  !skip {print}
' "$DUMP/data.sql" > "$DUMP/data.clean.sql"
wc -l "$DUMP"/*.clean.sql

log "Uploading to ${HOST}…"
ssh "$HOST" "mkdir -p $REMOTE_DIR/backups/cloud-import"
scp -q "$DUMP"/roles.clean.sql "$DUMP"/schema.clean.sql "$DUMP"/data.clean.sql "$HOST:$REMOTE_DIR/backups/cloud-import/"

log "Restoring on ${HOST}…"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR/backups/cloud-import
PSQL="docker exec -i supabase-db psql -U postgres -d postgres"
echo "[remote] roles (errors for pre-existing roles are expected)"
\$PSQL -q < roles.clean.sql || true
echo "[remote] schema"
\$PSQL -q -v ON_ERROR_STOP=1 --single-transaction < schema.clean.sql
echo "[remote] data (triggers disabled)"
( echo "SET session_replication_role = replica;"; cat data.clean.sql ) \
  | \$PSQL -q -v ON_ERROR_STOP=1 --single-transaction
echo "[remote] post-restore (publication, cron, analyze)"
\$PSQL -v ON_ERROR_STOP=1 < $REMOTE_DIR/sql/post-restore.sql
if [[ -f $REMOTE_DIR/sql/vault-secrets.sql ]]; then
  echo "[remote] vault secrets"
  \$PSQL -q -c "DELETE FROM vault.secrets" >/dev/null
  \$PSQL -q < $REMOTE_DIR/sql/vault-secrets.sql >/dev/null
else
  echo "[remote] WARNING: sql/vault-secrets.sql missing — fill it from sql/vault-secrets.sql.example"
fi
echo "[remote] restarting API services so PostgREST/Realtime reload the schema"
cd $REMOTE_DIR && docker compose restart rest realtime storage auth >/dev/null && docker compose ps --format 'table {{.Name}}\t{{.Status}}'
rm -f roles.clean.sql schema.clean.sql data.clean.sql
REMOTE
log "DONE. Now copy the Storage files: node infra/supabase-selfhost/scripts/copy-storage.mjs"
