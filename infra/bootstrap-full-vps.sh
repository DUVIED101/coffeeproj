#!/usr/bin/env bash
# Full VPS bootstrap after OS reinstall — provisions BOTH nginx proxies
# (bystrobarista.com marketing site + api.bystrobarista.com Supabase proxy)
# on a fresh Ubuntu 22.04 Time4VPS box.
#
# Runs `deploy-website-proxy.sh` for the marketing site half, then adds the
# Supabase-proxy half inline (previously bootstrapped manually per infra/README.md).
#
# Run from your laptop after reinstall completes:
#
#   scp -r /Users/davidenukashvili/coffeeproj/infra bystrobarista-vps:/tmp/ \
#     && ssh bystrobarista-vps 'bash /tmp/infra/bootstrap-full-vps.sh'

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly WEBSITE_CONF="${SCRIPT_DIR}/oracle-nginx-website-proxy.conf"
readonly SUPABASE_CONF="${SCRIPT_DIR}/oracle-nginx-supabase-proxy.conf"
readonly SUPABASE_DOMAIN="api.bystrobarista.com"
readonly EMAIL="support@bystrobarista.com"

log() { printf "[bootstrap] %s\n" "$*"; }
die() {
  printf "[bootstrap] ERROR: %s\n" "$*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "Run as root: bash $0"

log "===== Half 1/2: marketing site (bystrobarista.com) ====="
bash "${SCRIPT_DIR}/deploy-website-proxy.sh"

log "===== Half 2/2: Supabase proxy (${SUPABASE_DOMAIN}) ====="

# apt deps already installed by deploy-website-proxy.sh.

log "Issuing/renewing TLS cert for ${SUPABASE_DOMAIN}…"
# --nginx plugin needs a running nginx to write the ACME challenge into a
# server block. deploy-website-proxy.sh already started nginx, so this works
# without stopping traffic.
certbot certonly --nginx \
  -d "$SUPABASE_DOMAIN" \
  -m "$EMAIL" --agree-tos --non-interactive --keep-until-expiring

log "Tuning nginx worker + rate-limit settings…"
# worker_processes auto uses one worker per CPU core.
sed -i 's/^worker_processes .*/worker_processes auto;/' /etc/nginx/nginx.conf
# Raise per-worker connection limit (default 768) and file descriptors for
# Realtime WebSocket connections that each hold a persistent socket.
sed -i 's/worker_connections [0-9]*/worker_connections 8192/' /etc/nginx/nginx.conf
echo 'worker_rlimit_nofile 65535;' >> /etc/nginx/nginx.conf 2>/dev/null || true
install -m 0644 "${SCRIPT_DIR}/nginx-bystrobarista-tuning.conf" \
  /etc/nginx/conf.d/00-bystrobarista-tuning.conf

log "Installing nginx server block at /etc/nginx/sites-available/supabase-proxy…"
install -m 0644 "$SUPABASE_CONF" /etc/nginx/sites-available/supabase-proxy
[[ -L /etc/nginx/sites-enabled/supabase-proxy ]] || \
  ln -s /etc/nginx/sites-available/supabase-proxy /etc/nginx/sites-enabled/supabase-proxy

log "Validating full nginx config…"
nginx -t

log "Reloading nginx…"
systemctl reload nginx

log "Smoke tests:"
curl -fsSI -o /dev/null -w "  HTTPS bystrobarista.com     → %{http_code}\n" "https://bystrobarista.com/" \
  || log "  HTTPS bystrobarista.com failed"
curl -fsSI -o /dev/null -w "  HTTPS www.bystrobarista.com → %{http_code}\n" "https://www.bystrobarista.com/" \
  || log "  HTTPS www failed"
curl -fsSI -o /dev/null -w "  HTTPS ${SUPABASE_DOMAIN}    → %{http_code}\n" "https://${SUPABASE_DOMAIN}/auth/v1/health" \
  || log "  HTTPS api failed"

log "DONE. Both proxies live."
