-- Lowercase the username before removing characters, so uppercase names normalize correctly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
  display_value text;
  avatar_value text;
  fallback_name text;
begin
  chosen_name := pg_catalog.regexp_replace(
    pg_catalog.lower(coalesce(new.raw_user_meta_data ->> 'username', '')),
    '[^a-z0-9_.-]', '', 'g'
  );
  fallback_name := 'player_' || pg_catalog.substr(pg_catalog.replace(new.id::text, '-', ''), 1, 16);

  if pg_catalog.char_length(chosen_name) < 3 or pg_catalog.char_length(chosen_name) > 24 then
    chosen_name := fallback_name;
  end if;
  if exists (select 1 from public.profiles p where p.username = chosen_name) then
    chosen_name := fallback_name;
  end if;

  display_value := pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''), chosen_name),
    32
  );
  if pg_catalog.char_length(display_value) < 1 then
    display_value := 'Player';
  end if;

  avatar_value := new.raw_user_meta_data ->> 'avatar_key';
  if avatar_value is null or avatar_value not in ('nova','vex','orbit','pixel','ghost','ember','luna','drift') then
    avatar_value := 'nova';
  end if;

  begin
    insert into public.profiles (id, username, display_name, avatar_key)
    values (new.id, chosen_name, display_value, avatar_value)
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, display_name, avatar_key)
    values (new.id, fallback_name, display_value, avatar_value)
    on conflict (id) do nothing;
  end;

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
