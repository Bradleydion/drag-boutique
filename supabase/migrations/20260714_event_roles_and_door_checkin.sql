-- Event Roles + Door Staff Check-In — July 14, 2026
-- Creates event_roles and event_talent tables (were in code but never migrated)
-- Updates tickets check-in policy to allow door staff in addition to hosts

-- ── event_roles ───────────────────────────────────────────────────────────────
CREATE TABLE public.event_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  role_name    text NOT NULL,  -- see ROLE_TYPES in eventRolesStore.ts
  custom_name  text,
  slots        integer NOT NULL DEFAULT 1,
  pay_amount   integer NOT NULL DEFAULT 0,  -- stored in cents
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosts manage event roles" ON public.event_roles FOR ALL
  USING ((SELECT host_id FROM public.events WHERE id = event_id) = auth.uid()::text)
  WITH CHECK ((SELECT host_id FROM public.events WHERE id = event_id) = auth.uid()::text);

CREATE POLICY "anyone can read event roles" ON public.event_roles FOR SELECT USING (true);

-- ── event_talent ──────────────────────────────────────────────────────────────
-- NOTE: talent_id is text (not uuid) because performers.id is text
CREATE TABLE public.event_talent (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_role_id  uuid NOT NULL REFERENCES public.event_roles(id) ON DELETE CASCADE,
  talent_id      text REFERENCES public.performers(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'invited'
                   CHECK (status IN ('invited','accepted','declined','removed')),
  pay_agreed     integer,  -- cents, null until accepted
  invited_at     timestamptz NOT NULL DEFAULT now(),
  responded_at   timestamptz
);

ALTER TABLE public.event_talent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosts manage event talent" ON public.event_talent FOR ALL
  USING ((SELECT host_id FROM public.events WHERE id = event_id) = auth.uid()::text)
  WITH CHECK ((SELECT host_id FROM public.events WHERE id = event_id) = auth.uid()::text);

CREATE POLICY "talent can view own invites" ON public.event_talent FOR SELECT
  USING (talent_id IN (SELECT id FROM public.performers WHERE user_id = auth.uid()));

CREATE POLICY "talent can respond to invites" ON public.event_talent FOR UPDATE
  USING (talent_id IN (SELECT id FROM public.performers WHERE user_id = auth.uid()))
  WITH CHECK (talent_id IN (SELECT id FROM public.performers WHERE user_id = auth.uid()));

-- ── tickets: allow door staff to check in (in addition to host) ───────────────
DROP POLICY IF EXISTS "hosts can check in tickets" ON public.tickets;

CREATE POLICY "hosts and door staff can check in tickets" ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = tickets.event_id
      AND events.host_id = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.event_talent et
      JOIN public.event_roles er ON er.id = et.event_role_id
      JOIN public.performers p   ON p.id  = et.talent_id
      WHERE et.event_id::text = tickets.event_id
      AND er.role_name = 'door'
      AND et.status    = 'accepted'
      AND p.user_id    = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = tickets.event_id
      AND events.host_id = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.event_talent et
      JOIN public.event_roles er ON er.id = et.event_role_id
      JOIN public.performers p   ON p.id  = et.talent_id
      WHERE et.event_id::text = tickets.event_id
      AND er.role_name = 'door'
      AND et.status    = 'accepted'
      AND p.user_id    = auth.uid()
    )
  );
