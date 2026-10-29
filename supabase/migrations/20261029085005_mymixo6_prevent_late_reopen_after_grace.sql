-- If a member leaves just after the 10-minute grace period, don't let the
-- member-count trigger reopen the lobby before the 30-second cron tick.

create or replace function private.sync_mymixo6_lobby_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_lobby_id uuid;
  member_total integer;
begin
  target_lobby_id := coalesce(new.lobby_id, old.lobby_id);
  select count(*)::integer into member_total
  from public.lobby_members lm
  where lm.lobby_id = target_lobby_id;

  update public.lobbies l
  set member_count = member_total,
      status = case
        when l.status = 'closed' then 'closed'
        when l.status = 'full'
          and l.full_at is not null
          and l.full_at <= now() - interval '10 minutes'
          then 'closed'
        when member_total >= l.max_players then 'full'
        else 'open'
      end,
      full_at = case
        when l.status = 'closed' then l.full_at
        when l.status = 'full'
          and l.full_at is not null
          and l.full_at <= now() - interval '10 minutes'
          then l.full_at
        when member_total >= l.max_players then coalesce(l.full_at, now())
        else null
      end
  where l.id = target_lobby_id;
  return null;
end;
$function$;

revoke all on function private.sync_mymixo6_lobby_member_count() from public, anon, authenticated;
