-- Applied to the live project 2026-10-14 as migration contact_relay_and_unconfirmed_cleanup.

-- Contact relay log (server-only; written by the contact-relay edge function)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing','listing_buyer','event_host','event_talent')),
  target_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_sender_created on public.contact_messages (sender_id, created_at desc);
alter table public.contact_messages enable row level security;
-- No policies: only the service role (edge function) reads/writes.

-- Delete signups that never confirmed their email after 30 days.
-- Skips anyone who somehow has data attached, so nothing real is ever lost.
create or replace function public.purge_unconfirmed_signups()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare n integer;
begin
  with doomed as (
    select u.id from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - interval '30 days'
      and not exists (select 1 from public.performers p where p.user_id = u.id)
      and not exists (select 1 from public.events e where e.host_id = u.id::text)
      and not exists (select 1 from public.listings l where l.seller_id = u.id or l.buyer_id = u.id)
      and not exists (select 1 from public.tickets t where t.user_id = u.id)
  )
  delete from auth.users where id in (select id from doomed);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_unconfirmed_signups() from public, anon, authenticated;

-- Daily at 10:17 UTC (3:17 AM Pacific)
select cron.unschedule('purge-unconfirmed-signups') where exists (select 1 from cron.job where jobname = 'purge-unconfirmed-signups');
select cron.schedule('purge-unconfirmed-signups', '17 10 * * *', $$select public.purge_unconfirmed_signups()$$);
