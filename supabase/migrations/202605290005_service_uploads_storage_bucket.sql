-- NANOFIX V28.2 Service Operations Phase A.7
-- Private Supabase Storage bucket and policies for service-operation uploads.
-- Binary uploads use signed upload URLs; metadata is tracked in public.service_upload_reviews.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-uploads',
  'service-uploads',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "internal roles can read service uploads" on storage.objects;
create policy "internal roles can read service uploads"
on storage.objects for select
using (
  bucket_id = 'service-uploads'
  and exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer','finance')
  )
);

drop policy if exists "internal roles can upload service files" on storage.objects;
create policy "internal roles can upload service files"
on storage.objects for insert
with check (
  bucket_id = 'service-uploads'
  and exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
);

drop policy if exists "internal roles can update service upload metadata" on storage.objects;
create policy "internal roles can update service upload metadata"
on storage.objects for update
using (
  bucket_id = 'service-uploads'
  and exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support')
  )
)
with check (
  bucket_id = 'service-uploads'
  and exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support')
  )
);
