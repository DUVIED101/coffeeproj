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

Plain SSH works once the server has a "clean" IPv4 (see the lessons below: the
first IP was filtered on the border). The bootstrap still puts sshd behind TLS
on port 8443 (stunnel) as a fallback; with a filtered IP add
`ProxyCommand openssl s_client -quiet -connect %h:8443 -servername ssh.bystrobarista.com 2>/dev/null`
to the alias, or use the IPv6 address. `scp`, `rsync` and `deploy.sh` all use
the same alias:

```
Host bystrobarista-ru
  HostName 201.51.11.39
  User root
  IdentityFile ~/.ssh/bystrobarista-vps-rsa
  IdentitiesOnly yes
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
  `https://s3.twcstorage.ru`, **no region**, the bucket from `BACKUP_BUCKET`).

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
# 1. database, on the server (roles → schema → data with triggers off →
#    managed extras → post-restore → vault). Needs CLOUD_DB_PASSWORD and
#    CLOUD_DB_HOST=aws-1-eu-west-1.pooler.supabase.com in /root/bystrobarista-secrets.env.
ssh bystrobarista-ru /opt/bystrobarista/supabase/scripts/migrate-from-cloud.sh
# 2. storage buckets + files through the API (186 objects / 70 MB as of 2026-09-08);
#    the service_role key is the same on both sides because the JWT secret is shared.
KEY=$(ssh bystrobarista-ru "grep -m1 '^SERVICE_ROLE_KEY=' /opt/bystrobarista/supabase/.env | cut -d= -f2-")
SRC_URL=https://zifvfsamfzepxxuxhyhg.supabase.co SRC_KEY=$KEY \
DST_URL=https://api.bystrobarista.com DST_KEY=$KEY \
  node infra/supabase-selfhost/scripts/copy-storage.mjs
# 3. smoke + manual checks (see checklist below)
```

Re-running `migrate-from-cloud.sh` on a stack that already holds data fails on
duplicate objects: reset first with
`docker compose down && rm -rf volumes/db/data volumes/storage && docker compose up -d --wait`
on the server.

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

### Cutover log, 2026-09-10

Done in ~25 minutes without waiting for DNS:

1. Cloud writes frozen with a PostgREST pre-request function on `authenticator`
   (`pgrst.db_pre_request` → raises `PT503` for every non-GET request except
   POST `/rpc/` of STABLE functions). `default_transaction_read_only` does NOT
   work: PostgREST opens mutations with an explicit `READ WRITE`. GoTrue and
   Storage roles are reserved on the cloud and cannot be frozen; the counters
   (users, objects, messages, jobs) matched on both sides afterwards.
2. `.env` switched from `api-new` to `api`, stack reset, `migrate-from-cloud.sh`,
   `copy-storage.mjs` against `api-new` (still served by nginx at that point).
3. The LT VPS certificate for `api.bystrobarista.com` copied into
   `/etc/letsencrypt/live/api.bystrobarista.com/` so `deploy.sh` skipped certbot
   and installed the `api` vhost right away; the LT `supabase-proxy` upstream
   repointed at 201.51.11.39 (`infra/oracle-nginx-supabase-proxy.conf`), which
   moved all `api.` traffic to the new box before the DNS change.
4. DNS `api` → 201.51.11.39; then `certbot certonly --standalone` on the new box
   to replace the copied certificate with one that renews here.
5. Vercel `NEXT_PUBLIC_SUPABASE_URL` for web + admin, legal branches merged.

The cloud project stays frozen (read-only) for old non-RU iOS builds until it
is paused: unfreezing it would split writes between two databases.
To unfreeze: `ALTER ROLE authenticator RESET pgrst.db_pre_request; NOTIFY pgrst, 'reload config';`

## 6. Backups, restore, monitoring

- `scripts/backup.sh` runs nightly (cron installed by `deploy.sh`): roles, custom-format
  `pg_dump`, Storage tarball, pgsodium key volume → `bb-s3:bystrobarista-backups/<stamp>`,
  14-day retention, last 3 copies kept locally.
- `scripts/restore.sh <dir | bb-s3:bucket/stamp>` — monthly drill on a scratch stack.
- External heartbeat on `https://api.bystrobarista.com/auth/v1/health` and `/rest/v1/`
  (UptimeRobot or Yandex Monitoring), disk alert at 80 %.
- Cloudflare / RKN no longer matter for the API: nginx answers from Moscow.

## Lessons from the first rehearsal (2026-09-08)

- **Foreign IPv4 filter.** The first Timeweb IPv4 accepted TCP handshakes from
  abroad but never delivered data packets (check-host.net: RU nodes 200, ~35 of
  38 foreign nodes timeout; tcpdump on the box showed the client's first data
  packet never reaching eth0). Neighbouring IPs were fine. Replacing the IPv4
  in the panel («Сети» → server → delete IPv4 → issue new) fixed it at once;
  the swap reboots the server. Check a new IP with one `check-http` before
  building on it, and avoid port scans / repeated SSH probes from abroad.
- **IPv6 always worked** (`ssh -6 root@<ipv6>`), plain IPv4 SSH now works too;
  the stunnel wrapper on :8443 stays as a fallback.
- **Docker Hub** rate-limits anonymous pulls; bootstrap configures the Timeweb
  mirror `dockerhub.timeweb.cloud` in `/etc/docker/daemon.json`.
- **Outbound SMTP 25/465/587 is blocked** by Timeweb; GoTrue talks to Resend on
  **2587** (STARTTLS). 2465 is implicit TLS and GoTrue hangs on it.
- **No supabase CLI / pg_dump / Docker on the laptop is needed**: the dump runs
  inside the `supabase-db` container on the server over the Session pooler
  (`aws-1-eu-west-1.pooler.supabase.com`, user `postgres.<ref>`; `aws-0` does
  not know the project). Direct `db.<ref>.supabase.co` is IPv6-only and the
  containers have no IPv6.
- **Managed schemas are not in the schema dump.** `sync-managed-extras.sh`
  copies the `auth.users` trigger, the 16 `storage.objects` policies and the
  storage grants straight from the cloud. Storage rows are not dumped either
  (cloud has versioning columns the self-hosted storage-api lacks);
  `copy-storage.mjs` recreates buckets and objects through the API.
- Cloud auth tables that matter (users, identities, sessions, refresh_tokens,
  flow_state, mfa_amr_claims, one_time_tokens) have identical columns on both
  sides, so sessions survive the move. Empty auth tables drift and are skipped.
- Rehearsal counts: 188 auth users, 168 profiles, 28 jobs, 22 messages,
  186 storage objects, 64 RLS policies, 67 triggers, 2 cron jobs, 6 vault secrets.

## Legal documents

The four documents in `packages/core/legal/*.ts` (RU + EN) are the single
source for the app, the web version and the landing. Their effective dates
are pinned in `packages/core/config/legalVersions.ts`; bumping a version
sends every user through the re-consent gate on next sign-in, and
`legalVersions.spec.ts` fails when a version and the headline date drift.
The landing (`admin/src/app/{privacy,terms,consent,personal-data}/page.tsx`)
carries a generated copy of the RU bodies: regenerate it whenever a body
changes (the generator is the python snippet in the 2026-09 legal commit; keep
the `BODY` string byte-identical to `ru`).

The 2026-09-15 editions describe the Timeweb hosting, the reduced cross-border
list (Apple, Google, Mozilla, Resend, Vercel) and the web cookies, so they
must go live together with the cutover:

1. Merge branch `legal/ru-hosting` in this repo and in `admin/` right after
   the DNS switch (step 4 of §5); Vercel deploys both.
2. Ship an iOS build from `main` (the version bump lives in core, old builds
   keep the old texts and do not gate).
3. Add the cross-border recipients to the Роскомнадзор notification.

## Rollback

Point `api.bystrobarista.com` back at the Lithuanian VPS (185.81.166.243) and
restore `NEXT_PUBLIC_SUPABASE_URL` on Vercel; the cloud project is untouched
until it is deliberately paused. Data written to the self-hosted stack after
the cutover would need a reverse `pg_dump`.
