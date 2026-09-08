#!/usr/bin/env bash
# First-time setup of the Russian VDS that hosts self-hosted Supabase.
# Run ONCE as root on a fresh Ubuntu 24.04 box:
#
#   curl -fsSL https://raw.githubusercontent.com/DUVIED101/coffeeproj/main/infra/supabase-selfhost/scripts/bootstrap-server.sh \
#     | DOMAIN=api.bystrobarista.com bash
#
# Run it from the provider's browser console: plain SSH to a Russian IP from
# abroad stalls right after the banner exchange (DPI), so the first thing this
# script does is put sshd behind TLS on port 8443 (stunnel). The laptop then
# connects with `ProxyCommand openssl s_client` (README → "SSH from outside
# Russia").
#
# Idempotent. Installs Docker, nginx, certbot, rclone, ufw, fail2ban, a 2 GB
# swapfile, issues the TLS cert when DNS for $DOMAIN already points here
# (otherwise skips it; deploy.sh issues it later) and prepares
# /opt/bystrobarista/supabase. It does NOT start the stack: copy
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
  unattended-upgrades dnsutils jq stunnel4 >/dev/null

# sshd behind TLS on :8443 so the box stays reachable from outside Russia.
if [[ ! -f /etc/stunnel/ssh-tls.pem ]]; then
  log "stunnel: TLS wrapper for sshd on :8443…"
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 3650 \
    -subj "/CN=ssh.bystrobarista.com" \
    -keyout /etc/stunnel/ssh-tls.key -out /etc/stunnel/ssh-tls.crt >/dev/null 2>&1
  cat /etc/stunnel/ssh-tls.key /etc/stunnel/ssh-tls.crt > /etc/stunnel/ssh-tls.pem
  chmod 600 /etc/stunnel/ssh-tls.pem /etc/stunnel/ssh-tls.key
fi
cat >/etc/stunnel/ssh-tls.conf <<'STUNNEL'
foreground = no
setuid = stunnel4
setgid = stunnel4
pid = /run/stunnel4/ssh-tls.pid

[ssh-tls]
accept  = 8443
connect = 127.0.0.1:22
cert    = /etc/stunnel/ssh-tls.pem
STUNNEL
mkdir -p /run/stunnel4 && chown stunnel4:stunnel4 /run/stunnel4
systemctl enable stunnel4 >/dev/null 2>&1 || true
systemctl restart stunnel4

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

log "Firewall: 22, 80, 443, 8443 only…"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 8443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban

PUBLIC_IP="$(curl -fsS https://api.ipify.org)"
log "Public IP: $PUBLIC_IP; checking DNS for $DOMAIN…"
DNS_OK=0
for try in {1..12}; do
  if dig +short "$DOMAIN" @1.1.1.1 | grep -qx "$PUBLIC_IP"; then DNS_OK=1; log "DNS OK"; break; fi
  sleep 10
done
[[ $DNS_OK -eq 1 ]] || log "WARNING: DNS for $DOMAIN does not point at $PUBLIC_IP yet — skipping the certificate; deploy.sh issues it later."

if [[ $DNS_OK -eq 1 && ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
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

[bootstrap] DONE. sshd is reachable through TLS on $PUBLIC_IP:8443. Next, from your laptop:
  0. ~/.ssh/config:
       Host bystrobarista-ru
         HostName $PUBLIC_IP
         User root
         ProxyCommand openssl s_client -quiet -connect %h:8443 -servername ssh.bystrobarista.com 2>/dev/null
  1. scp infra/supabase-selfhost/.env.example bystrobarista-ru:$APP_DIR/.env
     then ssh in and fill it (see infra/supabase-selfhost/README.md → "Keys").
  2. rclone config on the server (remote name from BACKUP_RCLONE_REMOTE in .env).
  3. bash infra/supabase-selfhost/scripts/deploy.sh
EOT
