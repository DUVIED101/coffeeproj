#!/usr/bin/env bash
# First-time setup of the Russian VDS that hosts self-hosted Supabase.
# Run ONCE as root on a fresh Ubuntu 24.04 box:
#
#   scp infra/supabase-selfhost/scripts/bootstrap-server.sh root@<ip>:/tmp/ \
#     && ssh root@<ip> 'DOMAIN=api.bystrobarista.com bash /tmp/bootstrap-server.sh'
#
# Idempotent. Installs Docker, nginx, certbot, rclone, ufw, fail2ban, a 2 GB
# swapfile, issues the TLS cert (DNS for $DOMAIN must already point here) and
# prepares /opt/bystrobarista/supabase. It does NOT start the stack: copy
# .env.example → .env, fill it in, then run deploy.sh from your laptop.

set -euo pipefail

readonly DOMAIN="${DOMAIN:-api.bystrobarista.com}"
readonly EMAIL="${EMAIL:-support@bystrobarista.com}"
readonly APP_DIR="/opt/bystrobarista/supabase"

log() { printf "[bootstrap] %s\n" "$*"; }
die() { printf "[bootstrap] ERROR: %s\n" "$*" >&2; exit 1; }

[[ "$(id -u)" -eq 0 ]] || die "Run as root."

export DEBIAN_FRONTEND=noninteractive
log "apt packages…"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw fail2ban nginx certbot rclone \
  unattended-upgrades dnsutils jq >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  log "Docker (official convenience script)…"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if [[ ! -f /swapfile ]]; then
  log "2 GB swapfile (safety net for ~10 containers on 8 GB)…"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/90-bystrobarista.conf
fi

log "Firewall: 22, 80, 443 only…"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban

PUBLIC_IP="$(curl -fsS https://api.ipify.org)"
log "Public IP: $PUBLIC_IP; checking DNS for $DOMAIN…"
for try in {1..30}; do
  if dig +short "$DOMAIN" @1.1.1.1 | grep -qx "$PUBLIC_IP"; then log "DNS OK"; break; fi
  [[ $try -eq 30 ]] && die "DNS for $DOMAIN does not point at $PUBLIC_IP yet."
  sleep 10
done

if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  log "TLS cert via certbot --standalone (nginx stopped briefly)…"
  systemctl stop nginx
  trap 'systemctl start nginx 2>/dev/null || true' EXIT
  certbot certonly --standalone -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive
  systemctl start nginx
  trap - EXIT
fi
mkdir -p /var/www/html/.well-known/acme-challenge /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/sh
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "App dir $APP_DIR…"
mkdir -p "$APP_DIR" "$APP_DIR/backups"
rm -f /etc/nginx/sites-enabled/default

cat <<EOT

[bootstrap] DONE. Next, from your laptop:
  1. scp infra/supabase-selfhost/.env.example root@$PUBLIC_IP:$APP_DIR/.env
     then ssh in and fill it (see infra/supabase-selfhost/README.md → "Keys").
  2. rclone config on the server (remote name from BACKUP_RCLONE_REMOTE in .env).
  3. bash infra/supabase-selfhost/scripts/deploy.sh root@$PUBLIC_IP
EOT
