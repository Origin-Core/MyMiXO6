-- Avoid exposing every member's user ID to all signed-in users.
drop policy if exists "Lobby members are visible to signed in users" on public.lobby_members;
drop policy if exists "Users see their own lobby memberships" on public.lobby_members;
create policy "Users see their own lobby memberships"
on public.lobby_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.lobbies l
    where l.id = lobby_members.lobby_id
      and l.owner_id = (select auth.uid())
  )
);
grant select on public.lobby_members to authenticated;
