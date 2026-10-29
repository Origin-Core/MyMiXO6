-- Prevent browser clients from reopening full/closed lobbies or spoofing status.
-- Only system-owned triggers/jobs may transition status automatically;
-- an authenticated owner may voluntarily close their own lobby early.

create or replace function private.guard_mymixo6_lobby_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if current_user = 'postgres' then
    return new;
  end if;

  if new.status = 'closed'
     and old.status in ('open', 'full')
     and old.owner_id = (select auth.uid()) then
    return new;
  end if;

  raise exception 'Lobby status can only be changed by the system or closed by its owner';
end;
$function$;

drop trigger if exists mymixo6_guard_lobby_status_transition on public.lobbies;
create trigger mymixo6_guard_lobby_status_transition
before update of status on public.lobbies
for each row
execute function private.guard_mymixo6_lobby_status_transition();

revoke update on table public.lobbies from anon, authenticated;
grant update (status) on table public.lobbies to authenticated;
