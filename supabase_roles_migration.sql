-- ============================================================
-- Sequins — Roles & Talent Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── 1. talent_profile_roles ──────────────────────────────────
-- What roles a talent is confident filling.
-- role_name is one of the ROLE_TYPES constant values.

create table if not exists talent_profile_roles (
  id           uuid primary key default gen_random_uuid(),
  talent_id    text not null references performers(id) on delete cascade,
  role_name    text not null,   -- 'performer' | 'mc' | 'dj' | 'photographer' | 'door' | 'tip_collector' | 'makeup_artist' | 'other'
  custom_name  text,            -- filled when role_name = 'other'
  is_primary   boolean default false,
  created_at   timestamptz default now(),
  unique(talent_id, role_name)
);

alter table talent_profile_roles enable row level security;

create policy "anyone can read talent roles"
  on talent_profile_roles for select using (true);

create policy "talent manages own roles"
  on talent_profile_roles for all to authenticated
  using (talent_id in (select id from performers where user_id = auth.uid()))
  with check (talent_id in (select id from performers where user_id = auth.uid()));


-- ── 2. event_roles ───────────────────────────────────────────
-- Roles a host needs filled for a specific event.

create table if not exists event_roles (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references events(id) on delete cascade,
  role_name       text not null,
  custom_name     text,          -- filled when role_name = 'other'
  slots           integer not null default 1,
  pay_amount      integer not null default 0,  -- in cents
  created_at      timestamptz default now()
);

alter table event_roles enable row level security;

create policy "anyone can read event roles"
  on event_roles for select using (true);

create policy "host manages event roles"
  on event_roles for all to authenticated
  using (event_id in (select id from events where host_id = auth.uid()::text))
  with check (event_id in (select id from events where host_id = auth.uid()::text));


-- ── 3. event_talent ──────────────────────────────────────────
-- One row per talent per role per event.
-- A single talent can have multiple rows on the same event (one per role).

create table if not exists event_talent (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references events(id) on delete cascade,
  event_role_id   uuid not null references event_roles(id) on delete cascade,
  talent_id       text references performers(id) on delete set null,
  status          text not null default 'invited',  -- invited | accepted | declined | removed
  pay_agreed      integer,       -- in cents, set when talent accepts
  phone_number    text,          -- if talent not yet on platform (SMS invite)
  invite_token    text unique,   -- random token for SMS deep link
  invited_at      timestamptz default now(),
  responded_at    timestamptz,
  created_at      timestamptz default now()
);

alter table event_talent enable row level security;

create policy "anyone can read event talent"
  on event_talent for select using (true);

create policy "host can manage event talent"
  on event_talent for all to authenticated
  using (event_id in (select id from events where host_id = auth.uid()::text))
  with check (event_id in (select id from events where host_id = auth.uid()::text));

create policy "talent can update own invite"
  on event_talent for update to authenticated
  using (talent_id in (select id from performers where user_id = auth.uid()));


-- ── 4. payments (Stripe — wired in before launch) ────────────

create table if not exists payments (
  id                        uuid primary key default gen_random_uuid(),
  payer_id                  uuid references auth.users(id) on delete set null,
  payee_id                  uuid references auth.users(id) on delete set null,
  event_id                  text references events(id) on delete set null,
  event_talent_id           uuid references event_talent(id) on delete set null,
  type                      text not null,   -- 'tip' | 'booking' | 'ticket' | 'commission'
  amount                    integer not null, -- in cents
  platform_fee              integer default 0,
  stripe_payment_intent_id  text,
  status                    text default 'pending', -- pending | completed | refunded
  created_at                timestamptz default now()
);

alter table payments enable row level security;

create policy "users see own payments"
  on payments for select to authenticated
  using (auth.uid() = payer_id or auth.uid() = payee_id);
