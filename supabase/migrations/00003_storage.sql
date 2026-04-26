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
