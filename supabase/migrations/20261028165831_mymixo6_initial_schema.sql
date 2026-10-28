create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  display_name text not null default 'Player' check (char_length(display_name) between 1 and 32),
  avatar_key text not null default 'nova' check (avatar_key in ('nova','vex','orbit','pixel','ghost','ember','luna','drift')),
  bio text not null default '' check (char_length(bio) <= 180),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null check (char_length(game_name) between 2 and 60),
  title text not null check (char_length(title) between 3 and 80),
  server_url text not null default '' check (char_length(server_url) <= 500),
  description text not null default '' check (char_length(description) <= 1200),
  region text not null default 'EU' check (char_length(region) <= 24),
  max_players integer not null default 5 check (max_players between 2 and 100),
  status text not null default 'open' check (status in ('open','full','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lobby_members (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (lobby_id,user_id)
);
create index if not exists lobbies_status_created_idx on public.lobbies(status,created_at desc);
create index if not exists lobbies_owner_idx on public.lobbies(owner_id);
create index if not exists lobby_members_user_idx on public.lobby_members(user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_name text;
begin
 chosen_name := coalesce(nullif(new.raw_user_meta_data ->> 'username',''),'player_' || substr(new.id::text,1,8));
 insert into public.profiles(id,username,display_name,avatar_key) values(new.id,chosen_name,coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''),'Player'),coalesce(nullif(new.raw_user_meta_data ->> 'avatar_key',''),'nova')) on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_mymixo6 on auth.users;
create trigger on_auth_user_created_mymixo6 after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;
create policy "Profiles are publicly readable" on public.profiles for select to anon,authenticated using(true);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check((select auth.uid())=id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy "Open lobbies are public" on public.lobbies for select to anon,authenticated using(status='open' or owner_id=(select auth.uid()));
create policy "Authenticated users can create lobbies" on public.lobbies for insert to authenticated with check((select auth.uid())=owner_id);
create policy "Owners can update their lobbies" on public.lobbies for update to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy "Owners can delete their lobbies" on public.lobbies for delete to authenticated using((select auth.uid())=owner_id);
create policy "Users see their own lobby memberships" on public.lobby_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.lobbies l
    where l.id = lobby_members.lobby_id
      and l.owner_id = (select auth.uid())
  )
);
create policy "Users can join as themselves" on public.lobby_members for insert to authenticated with check((select auth.uid())=user_id);
create policy "Users can leave as themselves" on public.lobby_members for delete to authenticated using((select auth.uid())=user_id);
grant select on public.profiles to anon,authenticated;
grant insert,update on public.profiles to authenticated;
grant select on public.lobbies to anon,authenticated;
grant insert,update,delete on public.lobbies to authenticated;
grant select,insert,delete on public.lobby_members to authenticated;
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger lobbies_updated_at before update on public.lobbies for each row execute procedure public.set_updated_at();
revoke execute on function public.handle_new_user() from public,anon,authenticated;
grant execute on function public.handle_new_user() to service_role;
