#!/usr/bin/env bash
# Deploy / update the self-hosted Supabase stack from your laptop.
#
#   bash infra/supabase-selfhost/scripts/deploy.sh [ssh-host]   # default: bystrobarista-ru
#
# Syncs infra/supabase-selfhost/ (minus .env, data volumes, backups) plus the
# edge functions from supabase/functions/ to /opt/bystrobarista/supabase on
# the server, pulls images, restarts what changed, installs the nginx vhost
# and reloads nginx. Safe to re-run; the .env on the server is never touched.

set -euo pipefail

readonly HOST="${1:-bystrobarista-ru}"
readonly REMOTE_DIR="/opt/bystrobarista/supabase"
readonly REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
readonly SRC="$REPO_ROOT/infra/supabase-selfhost"
readonly FUNCTIONS_SRC="$REPO_ROOT/supabase/functions"

log() { printf "[deploy] %s\n" "$*"; }
die() { printf "[deploy] ERROR: %s\n" "$*" >&2; exit 1; }

[[ -f "$SRC/docker-compose.yml" ]] || die "Missing $SRC/docker-compose.yml"
[[ -d "$FUNCTIONS_SRC/send-push" ]] || die "Missing $FUNCTIONS_SRC/send-push"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
log "Staging in ${STAGE}…"
rsync -a --exclude '.env' --exclude 'volumes/db/data' --exclude 'volumes/storage' \
  --exclude 'backups' --exclude 'sql/vault-secrets.sql' "$SRC/" "$STAGE/"
for fn in "$FUNCTIONS_SRC"/*/; do
  name="$(basename "$fn")"
  rsync -a --delete "$fn" "$STAGE/volumes/functions/$name/"
done

log "Syncing to $HOST:${REMOTE_DIR}…"
ssh "$HOST" "mkdir -p $REMOTE_DIR"
rsync -az --delete \
  --exclude '.env' --exclude 'volumes/db/data' --exclude 'volumes/storage' \
  --exclude 'backups' --exclude 'sql/vault-secrets.sql' --exclude 'volumes/api/envoy/lds.yaml' \
  "$STAGE/" "$HOST:$REMOTE_DIR/"

log "Starting / updating containers…"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
[[ -f .env ]] || { echo "ERROR: $REMOTE_DIR/.env missing — copy .env.example and fill it in." >&2; exit 1; }
chmod +x volumes/api/envoy/docker-entrypoint.sh scripts/*.sh utils/*.sh
DOMAIN="\$(grep '^SUPABASE_PUBLIC_URL=' .env | cut -d= -f2- | sed 's|https\\?://||')"
if [[ ! -d "/etc/letsencrypt/live/\$DOMAIN" ]]; then
  echo "[remote] issuing TLS cert for \$DOMAIN (nginx stopped briefly)…"
  systemctl stop nginx
  certbot certonly --standalone -d "\$DOMAIN" -m support@bystrobarista.com --agree-tos --non-interactive \\
    --pre-hook 'systemctl stop nginx' --post-hook 'systemctl start nginx'
  systemctl start nginx
fi
docker compose pull -q
docker compose up -d --wait --remove-orphans
install -m 0644 nginx-tuning.conf /etc/nginx/conf.d/00-bystrobarista-tuning.conf
sed "s/__DOMAIN__/\$DOMAIN/g" nginx-api.conf > /etc/nginx/sites-available/supabase-api
rm -f /etc/nginx/sites-enabled/00-default
ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/supabase-api
nginx -t && systemctl reload nginx
# Nightly backup at 03:00 MSK (00:00 UTC).
( crontab -l 2>/dev/null | grep -v 'supabase/scripts/backup.sh' || true; echo "0 0 * * * $REMOTE_DIR/scripts/backup.sh >> /var/log/bystrobarista-backup.log 2>&1" ) | crontab -
docker compose ps
REMOTE
log "DONE. Smoke test: bash infra/supabase-selfhost/scripts/smoke-test.sh"
