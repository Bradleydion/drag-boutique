-- Migration: 20260907_notifications_rls_lockdown
--
-- Removes direct INSERT access on the notifications table for authenticated users.
-- All notification inserts must now go through the `send-notification` Edge Function,
-- which runs under the service-role key and validates the caller's JWT.
--
-- This closes the security gap noted in the 20260714 RLS audit:
--   "notifications INSERT: any authenticated user can notify any other user."

-- Drop the permissive INSERT policy that allowed client-side inserts
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.notifications;

-- Confirm RLS is still enabled (should already be from prior migration)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- READ: users can only read their own notifications (keep as-is)
-- (no change needed — prior policies cover this)

-- WRITE: no direct INSERT from clients — only service-role (used by the Edge Function)
-- Nothing to add: with no INSERT policy, RLS blocks all authenticated inserts by default.

-- Verify: the only remaining policies on notifications should be SELECT/UPDATE
-- for the owning user. Run this to confirm after applying:
--
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';
