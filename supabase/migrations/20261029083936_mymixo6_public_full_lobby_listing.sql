-- Keep full lobbies visible during their 10-minute grace period.
-- Applied to the connected MyMiXO6 Supabase project as migration 20261029083936.

drop policy if exists "Open lobbies are public" on public.lobbies;
drop policy if exists "Open and full lobbies are public" on public.lobbies;
create policy "Open and full lobbies are public"
  on public.lobbies
  for select
  to anon, authenticated
  using (
    status in ('open', 'full')
    or owner_id = (select auth.uid())
  );
