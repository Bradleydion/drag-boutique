-- RLS Security Audit Fixes — July 14, 2026
-- Applied to: vrlsphktnvxrbuwwuvpk (Sequins production)

-- ── 1. tickets: restrict check-in to event hosts only ────────────────────────
-- Previously: USING(true) WITH CHECK(true) — anyone could update any ticket row
DROP POLICY IF EXISTS "check_in_by_id" ON public.tickets;

CREATE POLICY "hosts can check in tickets" ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = tickets.event_id
      AND events.host_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = tickets.event_id
      AND events.host_id = auth.uid()::text
    )
  );

-- ── 2. delete_user(): fix mutable search_path + revoke anon execute ──────────
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon;

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- ── 3. rls_auto_enable(): revoke public execute (event trigger only) ──────────
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- ── 4. storage: remove duplicate broad SELECT on event-images ─────────────────
DROP POLICY IF EXISTS "public can view event images" ON storage.objects;

-- ── KNOWN ISSUES (post-beta fixes) ───────────────────────────────────────────
-- notifications INSERT: any authenticated user can notify any other user.
-- Risk: authenticated users could spam others' inboxes.
-- Fix: move addNotification() to a Supabase Edge Function using service_role key.
-- Blocked on: refactoring notificationsStore.ts client-side inserts.

-- Leaked password protection: enable in Supabase Dashboard →
--   Authentication → Sign In / Up → Password Protection → Enable HaveIBeenPwned
