-- =====================================================================
-- DigitalEconomy.cloud — initial schema
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- ----- enums -----
create type app_role as enum ('user', 'moderator', 'admin');
create type asset_status as enum ('draft', 'published', 'removed');
create type asset_license as enum ('CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'ARR');
create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ----- profiles -----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext not null unique,
  display_name text,
  bio text,
  avatar_url text,
  links jsonb,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handle_format check (handle ~* '^[a-z0-9_]{3,24}$')
);
create index profiles_handle_idx on public.profiles using btree (handle);

-- ----- categories -----
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  icon text,
  sort_order int not null default 0
);

-- ----- tags -----
create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
create index tags_name_trgm on public.tags using gin (name gin_trgm_ops);

-- ----- assets -----
create table public.assets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  license asset_license not null default 'CC-BY',
  status asset_status not null default 'published',
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  thumbnail_path text,
  download_count int not null default 0,
  view_count int not null default 0,
  like_count int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);
create index assets_owner_id_idx on public.assets (owner_id);
create index assets_category_idx on public.assets (category_id);
create index assets_status_idx on public.assets (status);
create index assets_created_at_idx on public.assets (created_at desc);
create index assets_search_tsv_idx on public.assets using gin (search_tsv);
create index assets_title_trgm on public.assets using gin (title gin_trgm_ops);

-- ----- asset_tags -----
create table public.asset_tags (
  asset_id uuid not null references public.assets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (asset_id, tag_id)
);
create index asset_tags_tag_id_idx on public.asset_tags (tag_id);

-- ----- likes -----
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);
create index likes_asset_id_idx on public.likes (asset_id);

-- ----- collections -----
create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, asset_id)
);

-- ----- reports -----
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports (status);
create index reports_asset_idx on public.reports (asset_id);

-- ----- asset_downloads (audit log) -----
create table public.asset_downloads (
  id bigserial primary key,
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index asset_downloads_asset_id_idx on public.asset_downloads (asset_id);

-- ----- updated_at trigger -----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- ----- create profile on user signup -----
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
  values (new.id, attempt, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- helpers: like_count + download_count -----
create or replace function public.toggle_like(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existed boolean;
begin
  if v_user is null then
    raise exception 'auth required';
  end if;
  delete from public.likes where user_id = v_user and asset_id = p_asset_id
    returning true into v_existed;
  if v_existed then
    update public.assets set like_count = greatest(like_count - 1, 0) where id = p_asset_id;
    return false;
  else
    insert into public.likes (user_id, asset_id) values (v_user, p_asset_id);
    update public.assets set like_count = like_count + 1 where id = p_asset_id;
    return true;
  end if;
end;
$$;

create or replace function public.increment_download_count(p_asset_id uuid)
returns int
language plpgsql
security definer
set search_path = public as $$
declare
  v_count int;
begin
  insert into public.asset_downloads (asset_id, user_id) values (p_asset_id, auth.uid());
  update public.assets
     set download_count = download_count + 1
   where id = p_asset_id and status = 'published'
  returning download_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

-- Trending: weighted score for the discovery feed.
create or replace function public.asset_trending_score(p_likes int, p_views int, p_downloads int, p_age_hours int)
returns numeric language sql immutable as $$
  select ((p_likes * 4 + p_downloads * 3 + p_views) / pow(greatest(p_age_hours, 1) + 2, 1.4));
$$;
