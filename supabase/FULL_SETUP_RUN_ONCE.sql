-- =====================================================================
-- DigitalEconomy.cloud — FULL DATABASE SETUP (run once per Supabase project)
-- =====================================================================
--
-- Apply this file when `public.profiles` (and related tables) do not exist yet —
-- for example if you connected Vercel to Supabase before running migrations.
--
-- Steps:
--   1. Supabase Dashboard → SQL Editor → New query.
--   2. Paste this entire file → Run (may take ~30 seconds).
--   3. Settings → API → Restart project (optional; refreshes PostgREST schema cache).
--
-- Safe on empty databases only. If you already ran parts of these migrations,
-- you may see "already exists" errors — stop and run missing files from
-- supabase/migrations/ individually, or use a fresh Supabase project.
--
-- =====================================================================

-- ========== 00001_init.sql ==========
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

-- ========== 00002_rls.sql ==========
-- =====================================================================
-- Row Level Security (RLS) policies
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.assets enable row level security;
alter table public.asset_tags enable row level security;
alter table public.likes enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.reports enable row level security;
alter table public.asset_downloads enable row level security;

-- ----- helper: is moderator/admin? -----
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('moderator', 'admin')
  );
$$;

-- ----- profiles -----
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

create policy "users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "staff can update any profile"
  on public.profiles for update using (public.is_staff());

-- ----- categories: public read, staff write -----
create policy "categories readable by all" on public.categories for select using (true);
create policy "categories writable by staff" on public.categories for all
  using (public.is_staff()) with check (public.is_staff());

-- ----- tags: public read, any authed user can create -----
create policy "tags readable by all" on public.tags for select using (true);
create policy "authed users can insert tags"
  on public.tags for insert with check (auth.uid() is not null);

-- ----- assets -----
create policy "published assets visible to all"
  on public.assets for select
  using (status = 'published' or owner_id = auth.uid() or public.is_staff());

create policy "owners can insert their own assets"
  on public.assets for insert with check (auth.uid() = owner_id);

create policy "owners can update their own assets"
  on public.assets for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "staff can update any asset"
  on public.assets for update using (public.is_staff());

create policy "owners can delete their own assets"
  on public.assets for delete using (auth.uid() = owner_id or public.is_staff());

-- ----- asset_tags -----
create policy "asset_tags readable by all" on public.asset_tags for select using (true);
create policy "owners manage their asset tags"
  on public.asset_tags for all
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and (a.owner_id = auth.uid() or public.is_staff())
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and (a.owner_id = auth.uid() or public.is_staff())
    )
  );

-- ----- likes -----
create policy "likes readable by all" on public.likes for select using (true);
create policy "users like for themselves"
  on public.likes for insert with check (auth.uid() = user_id);
create policy "users unlike their own"
  on public.likes for delete using (auth.uid() = user_id);

-- ----- collections -----
create policy "public collections readable, private to owner"
  on public.collections for select
  using (is_public or owner_id = auth.uid() or public.is_staff());
create policy "owners manage own collections"
  on public.collections for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "collection_items follow parent collection"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.is_public or c.owner_id = auth.uid() or public.is_staff())
    )
  );
create policy "owners modify own collection_items"
  on public.collection_items for all
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  );

-- ----- reports -----
create policy "users can file reports"
  on public.reports for insert with check (auth.uid() is not null and reporter_id = auth.uid());
create policy "reporter can read their reports"
  on public.reports for select using (reporter_id = auth.uid() or public.is_staff());
create policy "staff can update reports"
  on public.reports for update using (public.is_staff());

-- ----- asset_downloads (write via SECURITY DEFINER fn; restrict direct) -----
create policy "users can read their download history"
  on public.asset_downloads for select using (user_id = auth.uid() or public.is_staff());

-- ----- storage policies (run after buckets are created via 00003_storage.sql) -----

-- ========== 00003_storage.sql ==========
-- =====================================================================
-- Storage buckets + policies
-- Run AFTER creating these buckets in the Supabase dashboard, OR via:
--   supabase storage create assets-original --public=false
--   supabase storage create assets-preview  --public=true
--   supabase storage create avatars         --public=true
-- =====================================================================

-- Idempotent bucket creation:
insert into storage.buckets (id, name, public)
values
  ('assets-original', 'assets-original', false),
  ('assets-preview',  'assets-preview',  true),
  ('avatars',         'avatars',         true)
on conflict (id) do nothing;

-- ----- assets-original (private) -----
-- Path convention: {owner_id}/{asset_id}/{filename}
create policy "owners can read their original files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assets-original'
    and (split_part(name, '/', 1)::uuid = auth.uid() or public.is_staff())
  );

create policy "owners can upload to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assets-original'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy "owners can delete their originals"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assets-original'
    and (split_part(name, '/', 1)::uuid = auth.uid() or public.is_staff())
  );

-- ----- assets-preview (public read) -----
create policy "previews readable by all"
  on storage.objects for select using (bucket_id = 'assets-preview');

create policy "owners upload previews"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assets-preview'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy "owners delete their previews"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assets-preview'
    and (split_part(name, '/', 1)::uuid = auth.uid() or public.is_staff())
  );

-- ----- avatars (public read) -----
create policy "avatars readable by all"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy "users update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

-- ========== 00004_seed.sql ==========
-- =====================================================================
-- Seed: default categories
-- =====================================================================

insert into public.categories (name, slug, icon, sort_order) values
  ('Photography',  'photography',  'camera',         10),
  ('Illustration', 'illustration', 'palette',        20),
  ('Icons',        'icons',        'shapes',         30),
  ('Audio',        'audio',        'music',          40),
  ('Video',        'video',        'video',          50),
  ('3D Models',    '3d-models',    'box',            60),
  ('Fonts',        'fonts',        'type',           70),
  ('Templates',    'templates',    'layout',         80),
  ('Code',         'code',         'code',           90),
  ('Documents',    'documents',    'file-text',     100),
  ('Datasets',     'datasets',     'database',      110),
  ('Other',        'other',        'package',       999)
on conflict (slug) do nothing;

-- ========== 00005_web3.sql ==========
-- =====================================================================
-- DigitalEconomy.cloud — Phase 2 Web3 schema
-- Wallet linking (SIWE) + on-chain mint records.
-- This migration is forward-compatible with the MVP: nothing here is
-- required for the core upload/download flows.
-- =====================================================================

-- ---------- siwe nonces ----------
-- Short-lived, single-use nonces issued by GET /api/web3/siwe/nonce
-- and consumed by POST /api/web3/siwe/verify.
create table if not exists public.siwe_nonces (
  nonce        text primary key,
  address      citext,                 -- optional: bind to address before verify
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz
);

create index if not exists siwe_nonces_expires_idx
  on public.siwe_nonces (expires_at);

-- Periodically prune expired nonces. (Call via pg_cron or a Supabase scheduled function.)
create or replace function public.prune_siwe_nonces()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.siwe_nonces where expires_at < now() - interval '1 hour';
$$;

-- ---------- linked wallets ----------
-- A user may link one or more wallets. The `is_primary` flag identifies the
-- default wallet used for mints and on-chain attribution.
create table if not exists public.wallets (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  address         citext not null,             -- 0x-prefixed checksum lowercased
  chain_id        integer not null,            -- EVM chain id (1, 137, 8453, …)
  is_primary      boolean not null default false,
  verified_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (address, chain_id)
);

create index if not exists wallets_user_idx on public.wallets (user_id);

-- One primary wallet per user.
create unique index if not exists wallets_user_primary_unique
  on public.wallets (user_id)
  where is_primary;

-- ---------- mint records ----------
-- Records of NFT mints associated with an asset. The actual on-chain mint is
-- triggered client-side; this table stores the resulting tx + token metadata
-- so we can render "Minted as NFT" badges and link to block explorers.
create table if not exists public.mints (
  id              uuid primary key default uuid_generate_v4(),
  asset_id        uuid not null references public.assets(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  wallet_id       uuid references public.wallets(id) on delete set null,
  chain_id        integer not null,
  contract_address citext not null,
  token_id        text not null,               -- big int as text to avoid overflow
  tx_hash         citext not null,
  metadata_uri    text,                        -- ipfs:// or https:// JSON metadata
  block_number    bigint,
  minted_at       timestamptz not null default now(),
  unique (chain_id, contract_address, token_id)
);

create index if not exists mints_asset_idx on public.mints (asset_id);
create index if not exists mints_owner_idx on public.mints (owner_id);

-- ---------- RLS ----------
alter table public.siwe_nonces enable row level security;
alter table public.wallets     enable row level security;
alter table public.mints       enable row level security;

-- Nonces: never readable from the client. All access goes through service role.
-- (No policies = deny all for anon/authenticated, allow for service_role.)

-- Wallets: a user can read & manage their own wallets; public can read addresses
-- attached to a profile (so we can show "verified by 0x…" on profile pages).
create policy "wallets are publicly readable" on public.wallets
  for select using (true);

create policy "users manage their own wallets" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mints: publicly readable (so asset pages can show on-chain badges); only the
-- owner (or staff via service role) can insert/delete.
create policy "mints are publicly readable" on public.mints
  for select using (true);

create policy "owners can record their mints" on public.mints
  for insert with check (auth.uid() = owner_id);

create policy "owners can delete their mints" on public.mints
  for delete using (auth.uid() = owner_id);

-- ========== 00006_profile_safety.sql ==========
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

-- ========== 00007_view_count.sql ==========
-- =====================================================================
-- View count RPC
--
-- The asset detail page bumps `view_count` on every render. Anonymous
-- and non-owner users cannot UPDATE assets directly under the existing
-- RLS policy, so a SECURITY DEFINER RPC is needed to record views.
-- =====================================================================

create or replace function public.increment_view_count(p_asset_id uuid)
returns int
language plpgsql
security definer
set search_path = public as $$
declare
  v_count int;
begin
  update public.assets
     set view_count = view_count + 1
   where id = p_asset_id and status = 'published'
  returning view_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;
