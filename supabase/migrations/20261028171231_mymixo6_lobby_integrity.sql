-- Keep owner profile joins valid, expose safe member counts, and enforce lobby capacity server-side.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.lobbies
  add column if not exists member_count integer not null default 0;

alter table public.lobbies
  drop constraint if exists lobbies_owner_id_fkey;
alter table public.lobbies
  add constraint lobbies_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

update public.lobbies l
set member_count = (select count(*)::integer from public.lobby_members lm where lm.lobby_id = l.id),
    status = case
      when l.status = 'closed' then 'closed'
      when (select count(*) from public.lobby_members lm where lm.lobby_id = l.id) >= l.max_players then 'full'
      else 'open'
    end;

create or replace function private.enforce_mymixo6_lobby_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lobby_status text;
  lobby_capacity integer;
  member_total integer;
begin
  -- Let an existing membership reach the unique constraint, even for a full lobby.
  if exists (
    select 1 from public.lobby_members lm
    where lm.lobby_id = new.lobby_id and lm.user_id = new.user_id
  ) then
    return new;
  end if;

  select l.status, l.max_players
    into lobby_status, lobby_capacity
  from public.lobbies l
  where l.id = new.lobby_id
  for update;

  if not found then
    raise exception 'Lobby not found';
  end if;
  if lobby_status <> 'open' then
    raise exception 'This lobby is no longer open';
  end if;

  select count(*)::integer into member_total
  from public.lobby_members lm where lm.lobby_id = new.lobby_id;

  if member_total >= lobby_capacity then
    raise exception 'This lobby is full';
  end if;
  return new;
end;
$$;

create or replace function private.sync_mymixo6_lobby_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby_id uuid;
  member_total integer;
begin
  target_lobby_id := coalesce(new.lobby_id, old.lobby_id);
  select count(*)::integer into member_total
  from public.lobby_members lm where lm.lobby_id = target_lobby_id;

  update public.lobbies l
  set member_count = member_total,
      status = case
        when l.status = 'closed' then 'closed'
        when member_total >= l.max_players then 'full'
        else 'open'
      end
  where l.id = target_lobby_id;
  return null;
end;
$$;

revoke all on function private.enforce_mymixo6_lobby_capacity() from public, anon, authenticated;
revoke all on function private.sync_mymixo6_lobby_member_count() from public, anon, authenticated;

drop trigger if exists mymixo6_lobby_capacity_guard on public.lobby_members;
create trigger mymixo6_lobby_capacity_guard
before insert on public.lobby_members
for each row execute function private.enforce_mymixo6_lobby_capacity();

drop trigger if exists mymixo6_lobby_member_count on public.lobby_members;
create trigger mymixo6_lobby_member_count
after insert or delete on public.lobby_members
for each row execute function private.sync_mymixo6_lobby_member_count();

-- A client must not be able to forge the member count or change the owner id.
revoke update on public.lobbies from authenticated;
grant update (game_name, title, server_url, description, region, max_players, status)
on public.lobbies to authenticated;

-- Explicit grants remain necessary on projects that don't auto-expose new tables.
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.lobbies to anon, authenticated;
grant insert, delete on public.lobbies to authenticated;
grant select, insert, delete on public.lobby_members to authenticated;
