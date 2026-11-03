-- =============================================================================
-- Storage: public bucket for product, category and banner images.
-- Anyone can view; only administrators can upload, replace or delete.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-media',
  'store-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "store-media: public read" on storage.objects;
create policy "store-media: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'store-media');

drop policy if exists "store-media: admin insert" on storage.objects;
create policy "store-media: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-media' and public.is_admin());

drop policy if exists "store-media: admin update" on storage.objects;
create policy "store-media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-media' and public.is_admin())
  with check (bucket_id = 'store-media' and public.is_admin());

drop policy if exists "store-media: admin delete" on storage.objects;
create policy "store-media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-media' and public.is_admin());

