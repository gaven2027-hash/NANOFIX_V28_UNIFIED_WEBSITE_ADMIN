-- NANOFIX V28.1.3 Social Video Material Storage
-- Private storage bucket for AI/social source videos, reference videos, video clips, cover images and image materials.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nanofix-social-materials',
  'nanofix-social-materials',
  false,
  524288000,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists nanofix_social_materials_admin_read on storage.objects;
drop policy if exists nanofix_social_materials_admin_insert on storage.objects;
drop policy if exists nanofix_social_materials_admin_update on storage.objects;
drop policy if exists nanofix_social_materials_admin_delete on storage.objects;

create policy nanofix_social_materials_admin_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'nanofix-social-materials'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
);

create policy nanofix_social_materials_admin_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'nanofix-social-materials'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
);

create policy nanofix_social_materials_admin_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'nanofix-social-materials'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
)
with check (
  bucket_id = 'nanofix-social-materials'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
);

create policy nanofix_social_materials_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'nanofix-social-materials'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
);
