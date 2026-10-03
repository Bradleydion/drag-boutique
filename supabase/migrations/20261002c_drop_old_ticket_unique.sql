-- Oct 2026, part 3. Removes the old "one ticket per person per show" rule,
-- now replaced by tickets_user_event_occurrence_key (one per person per date).
alter table public.tickets drop constraint if exists tickets_user_id_event_id_key;
drop index if exists public.tickets_user_id_event_id_key;
