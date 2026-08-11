-- ===================================================================
-- SUPABASE RLS FIX — Run this in Supabase SQL Editor
-- This enables full read/write access for the anon key
-- Project: mmdvlnxbofjrhtnenanc
-- ===================================================================

-- Step 1: Make sure RLS is fully disabled on all tables
ALTER TABLE public.users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs     DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant ALL privileges to anon and authenticated roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

-- Step 3: Grant sequence access (for auto-increment IDs)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Step 4: Set schema usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
