#!/usr/bin/env bash
# One-shot deploy for the Russia-reachable marketing-site proxy.
#
# Designed to run on the Lithuanian proxy VM (185.81.166.243), the same box
# that already fronts api.bystrobarista.com → Supabase. After this script
# succeeds, https://bystrobarista.com hits Vercel through this VM.
#
# Run from your laptop:
#
#   scp -r /Users/davidenukashvili/coffeeproj/infra ubuntu@185.81.166.243:/tmp/ \
#     && ssh -t ubuntu@185.81.166.243 'sudo bash /tmp/infra/deploy-website-proxy.sh'
#
# Idempotent — re-runs cleanly if interrupted. The TLS cert is renewed (not
# re-issued) on subsequent runs if it's still valid.
#
# DNS prerequisite: bystrobarista.com AND www.bystrobarista.com A-records must
# already point at this VM. The script will wait up to 5 min for DNS to
# propagate, then bail with a clear error if it doesn't.

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly CONF_SRC="${SCRIPT_DIR}/oracle-nginx-website-proxy.conf"
readonly CONF_DST="/etc/nginx/sites-available/website-proxy"
readonly CONF_LINK="/etc/nginx/sites-enabled/website-proxy"
readonly DOMAIN_APEX="bystrobarista.com"
readonly DOMAIN_WWW="www.bystrobarista.com"
readonly EMAIL="support@bystrobarista.com"

log() { printf "[deploy] %s\n" "$*"; }
die() {
  printf "[deploy] ERROR: %s\n" "$*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "Run as root: sudo bash $0"
[[ -f "$CONF_SRC" ]] || die "Missing $CONF_SRC — scp the entire infra/ dir, not just this script."

log "Installing apt deps (nginx, certbot, dnsutils, curl, iptables-persistent)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  nginx certbot python3-certbot-nginx dnsutils curl iptables-persistent >/dev/null

PUBLIC_IP="$(curl -fsS https://api.ipify.org)"
log "VM public IP: $PUBLIC_IP"

# Wait up to 5 min for DNS to point at this VM. certbot won't issue a cert
# otherwise, so bail with a clear message instead of letting it fail cryptically.
check_dns() {
  local domain="$1"
  local resolved
  for try in {1..30}; do
    resolved="$(dig +short "$domain" @1.1.1.1 | tr '\n' ' ')"
    # During cutover the apex may carry both our IP and the old Vercel IP
    # (round-robin). Accept as long as ours is in the set; certbot HTTP-01 may
    # need a few retries to land on our IP, which is fine.
    if printf "%s" "$resolved" | tr ' ' '\n' | grep -qx "$PUBLIC_IP"; then
      log "DNS [$domain] OK → contains $PUBLIC_IP (full set: ${resolved% })"
      return 0
    fi
    log "DNS [$domain] try $try/30: got '${resolved:-NXDOMAIN}', want set containing $PUBLIC_IP"
    sleep 10
  done
  die "DNS for $domain never included $PUBLIC_IP. Update the A-record at the registrar and re-run."
}
check_dns "$DOMAIN_APEX"
check_dns "$DOMAIN_WWW"

log "Ensuring iptables allows ports 80/443 (idempotent)…"
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport "$port" -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true

# certonly --standalone needs port 80 free, so stop nginx briefly. The api.
# subdomain only uses port 80 for an HTTP→HTTPS redirect, so the impact on the
# Supabase proxy path is negligible (clients hit 443 directly).
log "Stopping nginx briefly to free port 80 for certbot --standalone…"
systemctl stop nginx
# Safety net: if certbot dies, bring nginx back up before exiting.
trap 'systemctl start nginx 2>/dev/null || true' EXIT

log "Issuing/renewing TLS cert for ${DOMAIN_APEX}, ${DOMAIN_WWW}…"
certbot certonly --standalone \
  -d "$DOMAIN_APEX" -d "$DOMAIN_WWW" \
  -m "$EMAIL" --agree-tos --non-interactive --keep-until-expiring

log "Installing nginx server block at $CONF_DST…"
install -m 0644 "$CONF_SRC" "$CONF_DST"
[[ -L "$CONF_LINK" ]] || ln -s "$CONF_DST" "$CONF_LINK"

log "Validating full nginx config (both supabase-proxy and website-proxy blocks)…"
nginx -t

log "Starting nginx…"
systemctl start nginx
trap - EXIT

# Auto-reload nginx whenever certbot renews any cert on this box (covers both
# api.bystrobarista.com and bystrobarista.com).
log "Installing nginx-reload hook for future cert renewals…"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/sh
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "Smoke tests (from this VM — looks at the public hostname):"
curl -fsS -o /dev/null -w "  HTTPS apex      → %{http_code}\n" "https://${DOMAIN_APEX}/" \
  || log "  HTTPS apex curl failed (check upstream Vercel deployment)"
curl -fsS -o /dev/null -w "  HTTPS www       → %{http_code}\n" "https://${DOMAIN_WWW}/" \
  || log "  HTTPS www curl failed"
curl -fsSI -o /dev/null -w "  HTTP→HTTPS apex → %{http_code}\n" "http://${DOMAIN_APEX}/" \
  || log "  HTTP redirect curl failed"

cat <<EOF

[deploy] DONE.

Expected smoke-test codes:
  HTTPS apex      → 200 (or 308 if Vercel redirects apex → www)
  HTTPS www       → 200
  HTTP→HTTPS apex → 301

If you see those, the proxy is live. Try opening https://${DOMAIN_APEX} from
a Russian device without VPN.

Rollback:
  sudo rm /etc/nginx/sites-enabled/website-proxy
  sudo systemctl reload nginx
  (and revert DNS A-records at the registrar)
EOF
