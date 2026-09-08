-- Run before restoring the cloud schema (migrate-from-cloud.sh does this).
-- The schema dump has CREATE EXTENSION lines stripped; the same extensions are
-- created here in the schemas the cloud project uses.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
GRANT USAGE ON SCHEMA cron TO postgres;
SELECT extname, extversion FROM pg_extension ORDER BY extname;
