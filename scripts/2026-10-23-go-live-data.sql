-- Go-live data cleanup + App Review account seed (Oct 23, 2026).
-- Run ONCE in the Supabase SQL Editor, AFTER the live Stripe keys are saved.
begin;

-- 1. The fake "Sequins Beta Bash" event (0 tickets).
delete from public.events where id = '866fb4b1-f4ec-414b-acdb-9c11d32ac00b';

-- 2. Test-mode Stripe records that can't work with live keys.
delete from public.payout_accounts;                                   -- Payout Setup starts fresh in live mode
delete from public.tickets where stripe_payment_intent_id is not null; -- test-mode paid/refunded tickets

-- 3. App Review account (bradleydion+review@thebradleyproject.com):
--    a show it hosts, and a ticket to an upcoming Portland show.
insert into public.events (host_id, host_name, title, description, datetime_start, datetime_end, timezone,
  venue_name, venue_address, venue_city, venue_state, venue_zip, ticket_price, image_url, capacity,
  is_recurring, performer_ids, is_promoted, all_sales_final)
select '74f277fd-65a7-433c-b5f9-9eba2feb5ae9', 'Bea Taapp Review', 'Bea''s Late Night Cabaret',
  'An evening of lip syncs, live vocals and comedy hosted by Bea Taapp. 21+. Doors at 9.',
  '2026-11-21 21:00:00-08', '2026-11-22 00:00:00-08', 'America/Los_Angeles',
  e.venue_name, e.venue_address, e.venue_city, e.venue_state, e.venue_zip, 0, e.image_url, 80,
  false, array['c2534fd6-c440-44f2-a4bf-5edcfac988e5']::text[], false, false
from public.events e where e.id = '732488d0-726b-4508-8ccf-c8f7a7ede299';

insert into public.tickets (user_id, event_id, price, payment_status, purchased_at)
values ('74f277fd-65a7-433c-b5f9-9eba2feb5ae9', '732488d0-726b-4508-8ccf-c8f7a7ede299', 0, 'free', now());

commit;
