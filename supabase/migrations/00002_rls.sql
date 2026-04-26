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
