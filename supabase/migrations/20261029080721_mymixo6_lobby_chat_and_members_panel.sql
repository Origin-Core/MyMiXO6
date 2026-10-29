-- MyMiXO6: private lobby panel, member roster visibility, and realtime chat.
-- Applied to the connected Supabase project as migration 20261029080721.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_lobby_participant(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    exists (
      select 1
      from public.lobby_members lm
      where lm.lobby_id = p_lobby_id
        and lm.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.lobbies l
      where l.id = p_lobby_id
        and l.owner_id = (select auth.uid())
    );
$function$;

revoke all on function private.is_lobby_participant(uuid) from public, anon;
grant execute on function private.is_lobby_participant(uuid) to authenticated;

create table if not exists public.lobby_messages (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists lobby_messages_lobby_created_idx
  on public.lobby_messages (lobby_id, created_at);

alter table public.lobby_messages enable row level security;
revoke all on table public.lobby_messages from anon;
grant select, insert on table public.lobby_messages to authenticated;

drop policy if exists "Lobby participants can read messages" on public.lobby_messages;
create policy "Lobby participants can read messages"
  on public.lobby_messages for select to authenticated
  using (private.is_lobby_participant(lobby_id));

drop policy if exists "Members can send messages to open lobbies" on public.lobby_messages;
create policy "Members can send messages to open lobbies"
  on public.lobby_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_lobby_participant(lobby_id)
    and exists (
      select 1 from public.lobbies l
      where l.id = lobby_id and l.status = 'open'
    )
  );

drop policy if exists "Users see their own lobby memberships" on public.lobby_members;
drop policy if exists "Lobby participants can see co-members" on public.lobby_members;
create policy "Lobby participants can see co-members"
  on public.lobby_members for select to authenticated
  using (private.is_lobby_participant(lobby_id));

drop policy if exists "Participants can view joined lobbies" on public.lobbies;
create policy "Participants can view joined lobbies"
  on public.lobbies for select to authenticated
  using (private.is_lobby_participant(id));

do $publication$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'lobby_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.lobby_messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'lobby_members'
  ) then
    execute 'alter publication supabase_realtime add table public.lobby_members';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'lobbies'
  ) then
    execute 'alter publication supabase_realtime add table public.lobbies';
  end if;
end
$publication$;
