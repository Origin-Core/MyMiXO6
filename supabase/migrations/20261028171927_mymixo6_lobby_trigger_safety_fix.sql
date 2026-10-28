-- Serialize capacity checks before duplicate membership checks and safely handle DELETE triggers.
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
  select l.status, l.max_players
    into lobby_status, lobby_capacity
  from public.lobbies l
  where l.id = new.lobby_id
  for update;

  if not found then
    raise exception 'Lobby not found';
  end if;

  if exists (
    select 1 from public.lobby_members lm
    where lm.lobby_id = new.lobby_id and lm.user_id = new.user_id
  ) then
    return new;
  end if;

  if lobby_status <> 'open' then
    raise exception 'This lobby is no longer open';
  end if;

  select count(*)::integer into member_total
  from public.lobby_members lm
  where lm.lobby_id = new.lobby_id;

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
  if tg_op = 'DELETE' then
    target_lobby_id := old.lobby_id;
  else
    target_lobby_id := new.lobby_id;
  end if;

  select count(*)::integer into member_total
  from public.lobby_members lm
  where lm.lobby_id = target_lobby_id;

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

notify pgrst, 'reload schema';
