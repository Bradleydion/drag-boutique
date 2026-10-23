-- Pre-launch lockdown (Oct 23, 2026)
-- payout_accounts is written only by edge functions (service role) and the
-- Stripe webhook; the app only reads its own row. Remove client writes.
drop policy if exists "Users can insert own payout account" on public.payout_accounts;
drop policy if exists "Users can update own payout account" on public.payout_accounts;
revoke insert, update, delete, truncate, references, trigger on public.payout_accounts from anon, authenticated;
revoke all on public.payout_accounts from anon;
-- Old account-deletion RPC: replaced by the delete-account edge function.
revoke execute on function public.delete_user() from authenticated, anon, public;
