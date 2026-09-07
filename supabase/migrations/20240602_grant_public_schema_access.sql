-- ============================================================
-- Future-proof Data API access for all public schema tables
-- ============================================================
-- Supabase is changing defaults (enforced October 30, 2026):
-- new tables in the "public" schema will require explicit GRANTs
-- before they're accessible via PostgREST / supabase-js.
--
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query.
-- It covers all existing tables AND sets default privileges so
-- every new table you create going forward is automatically
-- accessible without extra steps.
-- ============================================================

-- 1. Grant usage on the public schema itself
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant access to all EXISTING tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Grant access to all EXISTING sequences (used by serial/identity columns)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Grant access to all EXISTING functions / stored procedures
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Set DEFAULT PRIVILEGES so every NEW table, sequence, and function
--    created in the future automatically inherits these grants.
--    This is the key change — without it every new table needs a manual GRANT.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
