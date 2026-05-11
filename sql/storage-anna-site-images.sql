-- Public bucket anna-site-images on existing Supabase project (same project as DND; separate bucket, no extra project cost).

insert into storage.buckets (id, name, public, file_size_limit)
values ('anna-site-images', 'anna-site-images', true, 104857600)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read anna-site-images" on storage.objects;
create policy "Public read anna-site-images"
on storage.objects for select
to public
using (bucket_id = 'anna-site-images');

-- Optional anon upload (same risk model as dnd-site-images). Prefer service_role for uploads.
drop policy if exists "Anon insert anna-site-images" on storage.objects;
create policy "Anon insert anna-site-images"
on storage.objects for insert
to anon
with check (bucket_id = 'anna-site-images');

drop policy if exists "Anon update anna-site-images" on storage.objects;
create policy "Anon update anna-site-images"
on storage.objects for update
to anon
using (bucket_id = 'anna-site-images')
with check (bucket_id = 'anna-site-images');

drop policy if exists "Anon delete anna-site-images" on storage.objects;
create policy "Anon delete anna-site-images"
on storage.objects for delete
to anon
using (bucket_id = 'anna-site-images');
