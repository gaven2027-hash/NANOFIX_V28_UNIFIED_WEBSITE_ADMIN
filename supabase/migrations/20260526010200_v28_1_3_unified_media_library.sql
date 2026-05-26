-- NANOFIX V28.1.3 Unified Media Library
-- Provides one media intake model for admin modules: local upload, URL import, and library selection.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nanofix-media-library',
  'nanofix-media-library',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_assets (
  asset_id uuid primary key default gen_random_uuid(),
  source_type text not null default 'url_import' check (source_type in ('local_upload','url_import','library_selected','system_generated')),
  module_key text not null default 'general',
  usage_context text not null default 'content_editor',
  title text,
  alt_text text,
  description text,
  asset_url text,
  storage_bucket text not null default 'nanofix-media-library',
  storage_path text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric(12,2),
  checksum text,
  tags text[] not null default '{}'::text[],
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','archived','blocked','deleted')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets alter column source_type set default 'url_import';

alter table public.media_assets enable row level security;

create index if not exists media_assets_module_key_idx on public.media_assets(module_key);
create index if not exists media_assets_usage_context_idx on public.media_assets(usage_context);
create index if not exists media_assets_source_type_idx on public.media_assets(source_type);
create index if not exists media_assets_status_idx on public.media_assets(status);
create index if not exists media_assets_created_at_idx on public.media_assets(created_at);
create index if not exists media_assets_tags_idx on public.media_assets using gin(tags);
create index if not exists media_assets_metadata_idx on public.media_assets using gin(metadata_json);

drop policy if exists media_assets_admin_all on public.media_assets;
create policy media_assets_admin_all on public.media_assets for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

-- Public website may need to read published/active website images, but admin routes still use service role.
drop policy if exists media_assets_public_active_select on public.media_assets;
create policy media_assets_public_active_select on public.media_assets for select using (status = 'active' and module_key in ('website','website_management','public_website'));

-- Storage policies are intentionally narrow: public bucket read is allowed by Supabase public bucket behavior;
-- admin writes are performed by Next.js server routes using service_role, not directly from browser clients.
