-- Only allow normal HTTP(S) invite links from lobby owners.
alter table public.lobbies
  add constraint lobbies_server_url_http_check
  check (server_url = '' or server_url ~* '^https?://');
