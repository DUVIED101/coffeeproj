#!/usr/bin/env bash
# Restore a backup made by backup.sh onto THIS stack (disaster recovery / monthly drill).
#
#   scripts/restore.sh backups/<STAMP>            # local copy
#   scripts/restore.sh bb-s3:bystrobarista-backups/<STAMP>   # straight from S3
#
# Replaces the database contents and the Storage files. Run on a fresh stack
# (after `docker compose up -d --wait`) or on the live one during maintenance.

set -euo pipefail
cd "$(dirname "$0")/.."
envv() { grep -m1 "^$1=" .env | cut -d= -f2-; }
BACKUP_RCLONE_REMOTE="$(envv BACKUP_RCLONE_REMOTE)"; BACKUP_BUCKET="$(envv BACKUP_BUCKET)"; BACKUP_RETENTION_DAYS="$(envv BACKUP_RETENTION_DAYS)"

readonly SRC="${1:?usage: restore.sh <backup dir or rclone path>}"
log() { printf "[restore] %s\n" "$*"; }

WORK="$SRC"
if [[ "$SRC" == *:* ]]; then
  WORK="$(mktemp -d)"
  log "Downloading ${SRC}…"
  rclone copy --quiet "$SRC" "$WORK"
fi
[[ -f "$WORK/db.dump" ]] || { echo "ERROR: $WORK/db.dump not found" >&2; exit 1; }
( cd "$WORK" && sha256sum -c --quiet SHA256SUMS )

log "Stopping API services (db stays up)…"
docker compose stop auth rest realtime storage functions meta studio api-gw supavisor >/dev/null

log "Restoring roles…"
gunzip -c "$WORK/roles.sql.gz" | grep -v -E "^(CREATE|ALTER) ROLE (postgres|supabase_admin|supabase_auth_admin|supabase_storage_admin|supabase_functions_admin|supabase_read_only_user|supabase_replication_admin|authenticator|anon|authenticated|service_role|dashboard_user|pgbouncer|pgsodium_keyholder|pgsodium_keyiduser|pgsodium_keymaker)\b" \
  | docker exec -i supabase-db psql -U postgres -d postgres -q >/dev/null || true

log "Restoring database (pg_restore --clean)…"
docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges \
  --exit-on-error < "$WORK/db.dump"

log "Restoring Storage files…"
rm -rf volumes/storage && tar -C volumes -xzf "$WORK/storage.tgz"

if [[ -f sql/vault-secrets.sql ]]; then
  log "Re-creating vault secrets from sql/vault-secrets.sql…"
  docker exec -i supabase-db psql -U postgres -d postgres -q -c "DELETE FROM vault.secrets" >/dev/null
  docker exec -i supabase-db psql -U postgres -d postgres -q < sql/vault-secrets.sql >/dev/null
else
  log "WARNING: sql/vault-secrets.sql missing — push notifications will stay broken until vault secrets exist."
fi

log "Starting services…"
docker compose up -d --wait
docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT (SELECT count(*) FROM auth.users) users, (SELECT count(*) FROM public.jobs) jobs, (SELECT count(*) FROM storage.objects) objects"
log "DONE"
