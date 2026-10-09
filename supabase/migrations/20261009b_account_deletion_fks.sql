-- Audit item 4 (Oct 2026): deleting an account keeps the other party's records.
-- Tickets stay in the host's sales (refunds, tax totals); sold Shop listings
-- stay for the buyer/seller. The deleted user's id becomes NULL.
-- Used by the delete-account edge function and the old delete_user() RPC.

alter table public.tickets alter column user_id drop not null;
alter table public.tickets drop constraint if exists tickets_user_id_fkey;
alter table public.tickets add constraint tickets_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.listings alter column seller_id drop not null;
alter table public.listings drop constraint if exists listings_seller_id_fkey;
alter table public.listings add constraint listings_seller_id_fkey
  foreign key (seller_id) references auth.users(id) on delete set null;

alter table public.listings drop constraint if exists listings_buyer_id_fkey;
alter table public.listings add constraint listings_buyer_id_fkey
  foreign key (buyer_id) references auth.users(id) on delete set null;

-- Signed-out callers can't use the old RPC (it did nothing for them anyway).
revoke execute on function public.delete_user() from anon, public;
grant execute on function public.delete_user() to authenticated;
