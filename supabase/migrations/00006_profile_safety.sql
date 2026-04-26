-- =====================================================================
-- Profile safety net
--
-- Re-runnable migration that guarantees:
--   1. The `handle_new_user` trigger function exists and is current.
--   2. The `on_auth_user_created` trigger fires AFTER INSERT on auth.users.
--   3. Any pre-existing auth.users rows that somehow lack a profile get
--      one back-filled. This makes the platform self-heal even if an
--      earlier signup raced or the trigger wasn't installed.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
declare
  base_handle text;
  attempt text;
  i int := 0;
begin
  base_handle := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := base_handle || substr(md5(new.id::text), 1, 3);
  end if;
  base_handle := substr(base_handle, 1, 20);
  attempt := base_handle;
  while exists (select 1 from public.profiles where handle = attempt) loop
    i := i + 1;
    attempt := substr(base_handle, 1, 20) || i::text;
  end loop;
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    attempt,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      null
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- back-fill any orphaned auth.users without a profile -----
do $$
declare
  r record;
  base_handle text;
  attempt text;
  i int;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
      from auth.users u
      left join public.profiles p on p.id = u.id
     where p.id is null
  loop
    base_handle := lower(regexp_replace(coalesce(split_part(r.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));
    if length(base_handle) < 3 then
      base_handle := base_handle || substr(md5(r.id::text), 1, 3);
    end if;
    base_handle := substr(base_handle, 1, 20);
    attempt := base_handle;
    i := 0;
    while exists (select 1 from public.profiles where handle = attempt) loop
      i := i + 1;
      attempt := substr(base_handle, 1, 20) || i::text;
    end loop;
    insert into public.profiles (id, handle, display_name)
    values (
      r.id,
      attempt,
      coalesce(
        r.raw_user_meta_data->>'full_name',
        r.raw_user_meta_data->>'name',
        null
      )
    )
    on conflict (id) do nothing;
  end loop;
end $$;
