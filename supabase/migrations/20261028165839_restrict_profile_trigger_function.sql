-- The trigger function is invoked by Postgres, not directly by client roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
