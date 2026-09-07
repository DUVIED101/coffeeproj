-- Run after restoring roles.sql → schema.sql → data.sql from the cloud project
-- (scripts/migrate-from-cloud.sh does this automatically).
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < sql/post-restore.sql

-- 1. Realtime publication: the dump may carry CREATE PUBLICATION, but the
--    self-hosted init already created an empty supabase_realtime. Pin the set
--    of tables the six postgres_changes channels listen on (migrations 050,
--    054, 104).
ALTER PUBLICATION supabase_realtime SET TABLE
  public.messages,
  public.conversations,
  public.notifications,
  public.user_reports,
  public.applications,
  public.application_disputes;

-- 2. pg_cron jobs live in cron.job (extension data, not dumped).
--    Same definitions as migrations 124 and 127.
SELECT cron.schedule(
  'process_shift_reminders',
  '*/5 * * * *',
  $$SELECT app_internal.process_shift_reminders();$$
);
SELECT cron.schedule(
  'process_employment_lifecycle',
  '*/10 * * * *',
  $$SELECT app_internal.process_employment_lifecycle();$$
);

-- 3. Sequences / stats after a COPY-based restore.
ANALYZE;

-- 4. Report.
SELECT 'auth.users' AS what, count(*) FROM auth.users
UNION ALL SELECT 'public.users', count(*) FROM public.users
UNION ALL SELECT 'public.jobs', count(*) FROM public.jobs
UNION ALL SELECT 'public.messages', count(*) FROM public.messages
UNION ALL SELECT 'storage.buckets', count(*) FROM storage.buckets
UNION ALL SELECT 'storage.objects', count(*) FROM storage.objects
UNION ALL SELECT 'cron.job', count(*) FROM cron.job
UNION ALL SELECT 'rls policies', count(*) FROM pg_policies WHERE schemaname = 'public'
UNION ALL SELECT 'publication tables', count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
UNION ALL SELECT 'vault secrets', count(*) FROM vault.secrets;
