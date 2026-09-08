# infra/supabase-selfhost — self-hosted Supabase on a Russian VDS

Replaces the cloud project `zifvfsamfzepxxuxhyhg` (Supabase Free / Nano, eu-west-1)
with the official self-hosted stack on a Timeweb Cloud VDS in Moscow
(MSK 80: 4 vCPU / 8 GB / 80 GB NVMe). Motivation and the full migration plan:
`~/.claude/plans/delegated-seeking-tower.md` (2026-09-07). Short version:
the Nano instance stalls for 10–15 min under light load, Supabase Pro is only
payable through intermediaries, and 152-ФЗ wants the primary personal-data
database inside Russia.

The apps do not change. `api.bystrobarista.com` keeps its name and simply
starts pointing at this box instead of the Lithuanian nginx proxy; the mobile
apps already use it for Russian time zones, the web app and admin get
`NEXT_PUBLIC_SUPABASE_URL=https://api.bystrobarista.com`.

## Layout

| Path                                  | What                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker-compose.yml`                  | Upstream compose (Sept 2026) with our auth/edge config, loopback-only ports, PG tuning                                                                 |
| `.env.example`                        | Every variable with comments; copy to `.env` **on the server only**                                                                                    |
| `volumes/api/envoy/`                  | API gateway config (verbatim upstream)                                                                                                                 |
| `volumes/db/*.sql`                    | Postgres init scripts (verbatim upstream)                                                                                                              |
| `volumes/functions/main/`             | Edge-runtime router; `deploy.sh` copies `supabase/functions/*` next to it                                                                              |
| `volumes/templates/`                  | GoTrue e-mail templates (RU, 6-digit `{{ .Token }}`), served by the `mail-templates` container                                                         |
| `nginx-api.conf`, `nginx-tuning.conf` | Host nginx: TLS, only `/auth /rest /storage /realtime /functions /graphql` forwarded; Studio stays on loopback                                         |
| `sql/post-restore.sql`                | Re-pins the realtime publication, re-registers the two pg_cron jobs, prints counts                                                                     |
| `sql/vault-secrets.sql.example`       | Template for the six Vault secrets the push pipeline reads (`app_internal.send_apns_invoke`)                                                           |
| `scripts/`                            | `bootstrap-server.sh`, `deploy.sh`, `migrate-from-cloud.sh`, `copy-storage.mjs`, `backup.sh`, `restore.sh`, `apple-client-secret.mjs`, `smoke-test.sh` |
| `utils/`                              | Upstream key generators (`generate-keys.sh`, `add-new-auth-keys.sh`)                                                                                   |

Gitignored: `.env`, `volumes/db/data`, `volumes/storage`, `volumes/functions/*`
except `main/` + `deno.jsonc`, `sql/vault-secrets.sql`, `backups/`.

## 1. Server bootstrap (once)

```bash
# DNS first: A record api.bystrobarista.com → <vds ip> (for a rehearsal use
# api-new.bystrobarista.com and DOMAIN=api-new… below). TTL 60.
# In the provider's browser console, logged in as root:
curl -fsSL https://raw.githubusercontent.com/DUVIED101/coffeeproj/main/infra/supabase-selfhost/scripts/bootstrap-server.sh \
  | DOMAIN=api.bystrobarista.com bash
```

### SSH from outside Russia

Plain SSH to a Russian IP stalls right after the banner exchange (DPI), from a
laptop abroad and from the Lithuanian VPS alike. The bootstrap therefore puts
sshd behind TLS on port 8443 (stunnel, self-signed cert) and the laptop connects
through `openssl s_client`, which looks like ordinary HTTPS on the wire.
`scp`, `rsync` and `deploy.sh` all use the same alias:

```
Host bystrobarista-ru
  HostName <vds ip>
  User root
  IdentityFile ~/.ssh/bystrobarista-vps-rsa
  IdentitiesOnly yes
  ProxyCommand openssl s_client -quiet -connect %h:8443 -servername ssh.bystrobarista.com 2>/dev/null
```

## 2. Keys and `.env`

On the server, in `/opt/bystrobarista/supabase`:

```bash
cp .env.example .env
sh utils/generate-keys.sh --update-env        # random passwords + a throwaway JWT set
```

Then **overwrite** `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` with the cloud
project's values (Dashboard → Project Settings → API → JWT Settings / API keys).
This is what keeps the anon key baked into shipped iOS builds, and every
existing session, valid after the cutover. Only after that:

```bash
sh utils/add-new-auth-keys.sh --update-env    # ES256 key pair → JWT_KEYS / JWT_JWKS
```

(the script also tries to uncomment lines in `docker-compose.yml`; ours are
already enabled, the warning is harmless.) Fill in the rest of `.env`:

- SMTP: the Resend credentials from Dashboard → Authentication → SMTP.
- `APPLE_CLIENT_SECRET`: `node scripts/apple-client-secret.mjs` on the laptop
  with the SIWA `.p8`; valid 180 days, calendar reminder.
- `GOOGLE_CLIENT_IDS` / `GOOGLE_CLIENT_SECRET`: Dashboard → Authentication → Providers → Google.
- Edge-function secrets: `supabase secrets list` on the cloud project gives the
  names; the values are in the password manager (`APNS_KEY_P8` as one line with `\n`).
- `sql/vault-secrets.sql`: copy the `.example`, paste `SERVICE_ROLE_KEY` and the VAPID keys.
- `rclone config` → remote `bb-s3` (type s3, provider Other, endpoint
  `https://s3.timeweb.cloud`, the bucket from `BACKUP_BUCKET`).

## 3. Deploy

```bash
bash infra/supabase-selfhost/scripts/deploy.sh          # ssh host bystrobarista-ru
SUPABASE_ANON_KEY=... bash infra/supabase-selfhost/scripts/smoke-test.sh
```

`deploy.sh` is the only way config reaches the server: it rsyncs this
directory plus `supabase/functions/`, pulls images, `docker compose up -d --wait`,
installs the nginx vhost and the nightly backup cron. Re-run after every
change here or in an edge function. Upgrades: bump image tags in
`docker-compose.yml` (check the GoTrue / Realtime changelogs), deploy.

Studio: `ssh -L 8000:127.0.0.1:8000 bystrobarista-ru`, then
http://localhost:8000 with `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
Postgres: `ssh -L 5432:127.0.0.1:5432 bystrobarista-ru`, user `postgres`.

## 4. Copying the cloud project

Rehearse on the temporary hostname first, then repeat for real.

```bash
# 1. database (roles → schema → data, triggers off; then post-restore + vault)
CLOUD_DB_URL='postgresql://postgres.zifvfsamfzepxxuxhyhg:<pw>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
  bash infra/supabase-selfhost/scripts/migrate-from-cloud.sh
# 2. storage files (186 objects / 70 MB as of 2026-09-07)
SRC_URL=https://zifvfsamfzepxxuxhyhg.supabase.co SRC_KEY=<cloud service_role> \
DST_URL=https://api.bystrobarista.com DST_KEY=<self-hosted service_role> \
  node infra/supabase-selfhost/scripts/copy-storage.mjs
# 3. smoke + manual checks (see checklist below)
```

Re-running `migrate-from-cloud.sh` on a stack that already holds data will
fail on duplicate keys: reset with `docker compose down && rm -rf volumes/db/data && deploy.sh`.

Manual checklist after a copy: sign-up with OTP e-mail, Apple / Google / Yandex
sign-in, job search with distance, avatar upload and `/render/image` thumbnail,
chat over WebSocket, a push through a trigger (`app_internal.apns_dispatch_log`
gets a row with `vault_ok = true`), account deletion, admin OTP login,
`admin_force_logout_user`.

## 5. Cutover (30–60 min window)

1. Lower the TTL of `api.bystrobarista.com` to 60 a day before.
2. `NEXT_PUBLIC_MAINTENANCE_MODE=true` on Vercel (web); announce.
3. Reset the self-hosted data (`down`, `rm -rf volumes/db/data volumes/storage`, `deploy.sh`)
   and run §4 against the live cloud project.
4. DNS: `api.bystrobarista.com` A → this VDS. Certificate already issued in §1
   (or, if you rehearsed on `api-new`, run `certbot certonly --standalone -d api.bystrobarista.com`
   with nginx stopped, then `deploy.sh`).
5. Vercel env for `bystrobarista-web` and the admin project:
   `NEXT_PUBLIC_SUPABASE_URL=https://api.bystrobarista.com`; redeploy both.
6. Lithuanian VPS: point `supabase-proxy` upstream at this box or remove the
   vhost; `app.`/`www.` proxies stay until the web app moves.
7. Maintenance off, smoke test, watch `docker compose logs -f auth rest realtime storage functions`.
8. Keep the cloud project alive 2–4 weeks for old iOS builds outside Russia
   (they call `supabase.co` directly); ship a release with
   `SUPABASE_URL=https://api.bystrobarista.com`, then pause and delete the project.

## 6. Backups, restore, monitoring

- `scripts/backup.sh` runs nightly (cron installed by `deploy.sh`): roles, custom-format
  `pg_dump`, Storage tarball, pgsodium key volume → `bb-s3:bystrobarista-backups/<stamp>`,
  14-day retention, last 3 copies kept locally.
- `scripts/restore.sh <dir | bb-s3:bucket/stamp>` — monthly drill on a scratch stack.
- External heartbeat on `https://api.bystrobarista.com/auth/v1/health` and `/rest/v1/`
  (UptimeRobot or Yandex Monitoring), disk alert at 80 %.
- Cloudflare / RKN no longer matter for the API: nginx answers from Moscow.

## Rollback

Point `api.bystrobarista.com` back at the Lithuanian VPS (185.81.166.243) and
restore `NEXT_PUBLIC_SUPABASE_URL` on Vercel; the cloud project is untouched
until it is deliberately paused. Data written to the self-hosted stack after
the cutover would need a reverse `pg_dump`.
