#!/usr/bin/env bash
# Nightly backup of the self-hosted stack (installed in root's crontab by deploy.sh).
#   - roles + full custom-format pg_dump (auth, storage metadata, public, cron, vault)
#   - Storage files (volumes/storage)
#   - the pgsodium root key volume (db-config) — without it vault secrets in the
#     dump are unreadable; restore.sh recreates them from sql/vault-secrets.sql anyway
# Uploaded with rclone to $BACKUP_RCLONE_REMOTE:$BACKUP_BUCKET, pruned after
# $BACKUP_RETENTION_DAYS. The last 3 local copies stay in ./backups.

set -euo pipefail
cd "$(dirname "$0")/.."
envv() { grep -m1 "^$1=" .env | cut -d= -f2-; }
BACKUP_RCLONE_REMOTE="$(envv BACKUP_RCLONE_REMOTE)"; BACKUP_BUCKET="$(envv BACKUP_BUCKET)"; BACKUP_RETENTION_DAYS="$(envv BACKUP_RETENTION_DAYS)"

readonly STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
readonly OUT="backups/$STAMP"
readonly REMOTE="${BACKUP_RCLONE_REMOTE:-bb-s3}:${BACKUP_BUCKET:-bystrobarista-backups}"
readonly RETENTION="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$OUT"

log() { printf "[backup %s] %s\n" "$(date -u +%H:%M:%S)" "$*"; }

log "pg_dumpall roles…"
docker exec supabase-db pg_dumpall -U postgres --roles-only | gzip > "$OUT/roles.sql.gz"
log "pg_dump postgres (custom format)…"
docker exec supabase-db pg_dump -U postgres -Fc --no-owner --no-privileges postgres > "$OUT/db.dump"
log "Storage files…"
tar -C volumes -czf "$OUT/storage.tgz" storage
log "db-config volume (pgsodium key)…"
docker run --rm -v supabase_db-config:/c:ro -v "$PWD/$OUT:/out" alpine:3 tar -C /c -czf /out/db-config.tgz .
sha256sum "$OUT"/* > "$OUT/SHA256SUMS"
du -sh "$OUT"

if rclone listremotes | grep -q "^${REMOTE%%:*}:$"; then
  log "Uploading to $REMOTE/${STAMP}…"
  rclone copy --quiet "$OUT" "$REMOTE/$STAMP"
  log "Pruning remote copies older than ${RETENTION}d…"
  rclone delete --quiet --min-age "${RETENTION}d" "$REMOTE" && rclone rmdirs --quiet --leave-root "$REMOTE" || true
else
  log "WARNING: rclone remote '${REMOTE%%:*}' not configured — backup kept locally only."
fi

ls -1dt backups/*/ | tail -n +4 | xargs -r rm -rf
log "DONE $STAMP"
