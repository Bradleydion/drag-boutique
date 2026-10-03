-- Oct 2026, part 2. Applied to production 2026-10-02.
-- (a) Tickets belong to one date of a show, so a single night of a recurring
--     show can be cancelled, and fans can hold tickets to different nights.
-- (b) Track money collected from hosts' future ticket sales toward what they
--     owe from cancellations.

-- (a) Dates
alter table public.events
  add column if not exists cancelled_occurrences timestamptz[] not null default '{}';

alter table public.tickets
  add column if not exists occurrence_start timestamptz;

-- One-time shows: every ticket is for the show's only date.
update public.tickets t
set occurrence_start = e.datetime_start
from public.events e
where e.id::text = t.event_id
  and coalesce(e.is_recurring, false) = false
  and t.occurrence_start is null;

-- One ticket per person per date (replaces one ticket per person per show).
create unique index if not exists tickets_user_event_occurrence_key
  on public.tickets (user_id, event_id, coalesce(occurrence_start, 'epoch'::timestamptz));

-- Only the server may change cancellation state.
create or replace function public.events_guard_cancelled_at()
returns trigger
language plpgsql
as $$
begin
  if (new.cancelled_at is distinct from old.cancelled_at
      or new.cancelled_occurrences is distinct from old.cancelled_occurrences)
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Use Cancel Show in the app to cancel an event.';
  end if;
  return new;
end;
$$;

-- No new tickets for a cancelled show or a cancelled night.
create or replace function public.tickets_block_cancelled_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.events e
    where e.id::text = new.event_id
      and (
        e.cancelled_at is not null
        or (new.occurrence_start is not null and exists (
          select 1 from unnest(e.cancelled_occurrences) c
          where abs(extract(epoch from (c - new.occurrence_start))) < 60
        ))
      )
  ) then
    raise exception 'This show has been cancelled.';
  end if;
  return new;
end;
$$;

-- (b) Collections from future sales
create table if not exists public.host_charge_collections (
  id                 uuid primary key default gen_random_uuid(),
  host_id            text not null,
  payment_intent_id  text not null unique,
  amount             numeric not null,                 -- dollars kept from this sale toward the balance
  status             text not null default 'pending',  -- pending | collected | released | refunded
  created_at         timestamptz not null default now()
);

alter table public.host_charge_collections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'host_charge_collections' and policyname = 'hosts read own collections') then
    create policy "hosts read own collections" on public.host_charge_collections
      for select using ((auth.uid())::text = host_id);
  end if;
end $$;
