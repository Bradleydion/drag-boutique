-- Host-cancelled shows (Oct 2026). Applied to production 2026-10-02.
-- Cancelling goes through the cancel-event Edge Function, which refunds every
-- fan in full and charges the host the Stripe processing fees on those sales.

-- 1. Cancellation state on events
alter table public.events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

-- Only the server (service role) may set or clear cancelled_at, so a show
-- can't be marked cancelled from the app without its refunds running.
create or replace function public.events_guard_cancelled_at()
returns trigger
language plpgsql
as $$
begin
  if new.cancelled_at is distinct from old.cancelled_at
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Use Cancel Show in the app to cancel an event.';
  end if;
  return new;
end;
$$;

create or replace trigger events_guard_cancelled_at
  before update on public.events
  for each row execute function public.events_guard_cancelled_at();

-- 2. No new tickets (free or paid) for a cancelled show
create or replace function public.tickets_block_cancelled_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.events e
    where e.id::text = new.event_id and e.cancelled_at is not null
  ) then
    raise exception 'This show has been cancelled.';
  end if;
  return new;
end;
$$;

create or replace trigger tickets_block_cancelled_event
  before insert on public.tickets
  for each row execute function public.tickets_block_cancelled_event();

-- 3. What hosts owe Sequins when they cancel a paid show
create table if not exists public.host_charges (
  id                      uuid primary key default gen_random_uuid(),
  host_id                 text not null,
  event_id                uuid references public.events(id) on delete set null,
  reason                  text not null default 'show_cancelled',
  amount                  numeric not null,          -- total owed (dollars)
  stripe_fees             numeric not null default 0, -- card processing fees on the refunded sales
  unrecovered_sales       numeric not null default 0, -- ticket money that couldn't be pulled back from the payout
  tickets_refunded        integer not null default 0,
  status                  text not null default 'pending', -- pending | collected | owed
  stripe_transfer_id      text,
  error                   text,
  created_at              timestamptz not null default now()
);

alter table public.host_charges enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'host_charges' and policyname = 'hosts read own charges') then
    create policy "hosts read own charges" on public.host_charges
      for select using ((auth.uid())::text = host_id);
  end if;
end $$;
-- No insert/update policies: only the server writes these rows.
