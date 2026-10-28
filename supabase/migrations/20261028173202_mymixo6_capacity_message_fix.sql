-- Report a full lobby accurately even when status was already updated to 'full'.
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

  if lobby_status = 'closed' then
    raise exception 'This lobby is no longer open';
  end if;

  select count(*)::integer into member_total
  from public.lobby_members lm
  where lm.lobby_id = new.lobby_id;

  if member_total >= lobby_capacity then
    raise exception 'This lobby is full';
  end if;

  if lobby_status <> 'open' then
    raise exception 'This lobby is no longer open';
  end if;

  return new;
end;
$$;
revoke all on function private.enforce_mymixo6_lobby_capacity() from public, anon, authenticated;
