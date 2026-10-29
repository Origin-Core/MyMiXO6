-- Start a server-owned 10-minute grace period when a lobby reaches capacity.
-- Applied to the connected MyMiXO6 Supabase project as migration 20261029083819.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

alter table public.lobbies
  add column if not exists full_at timestamptz;

update public.lobbies
set full_at = coalesce(full_at, now())
where status = 'full' and full_at is null;

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
        when member_total >= l.max_players then 'full'
        else 'open'
      end,
      full_at = case
        when l.status = 'closed' then l.full_at
        when member_total >= l.max_players then coalesce(l.full_at, now())
        else null
      end
  where l.id = target_lobby_id;
  return null;
end;
$function$;

revoke all on function private.sync_mymixo6_lobby_member_count() from public, anon, authenticated;

drop policy if exists "Members can send messages to open lobbies" on public.lobby_messages;
create policy "Members can send messages to active lobbies"
  on public.lobby_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_lobby_participant(lobby_id)
    and exists (
      select 1 from public.lobbies l
      where l.id = lobby_id
        and (
          l.status = 'open'
          or (l.status = 'full' and l.full_at is not null and l.full_at > now() - interval '10 minutes')
        )
    )
  );

do $schedule$
declare
  existing_job record;
begin
  for existing_job in select jobid from cron.job where jobname = 'mymixo6-auto-close-full-lobbies'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'mymixo6-auto-close-full-lobbies',
    '30 seconds',
    $command$
      update public.lobbies
      set status = 'closed'
      where status = 'full'
        and full_at is not null
        and full_at <= now() - interval '10 minutes';
    $command$
  );
end;
$schedule$;
