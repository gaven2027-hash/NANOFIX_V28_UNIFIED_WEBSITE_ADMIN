-- NANOFIX V28.6.3.1 Website CMS Bridge + Versioning Repair
-- Purpose:
-- 1. Add website_media_assets marker and real schema foundation.
-- 2. Add website_page_versions marker and real schema foundation.
-- 3. Support Media Library binding, page version history, publish evidence and rollback.
-- 4. Do not reset production data. Idempotent only.

create table if not exists public.website_media_assets (
  asset_id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'website-media',
  storage_path text not null,
  public_url text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  caption text,
  linked_page_id uuid,
  linked_block_id uuid,
  usage_context text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_website_media_assets_status
  on public.website_media_assets(status);

create index if not exists idx_website_media_assets_linked_page_id
  on public.website_media_assets(linked_page_id);

create index if not exists idx_website_media_assets_linked_block_id
  on public.website_media_assets(linked_block_id);

create table if not exists public.website_page_versions (
  version_id uuid primary key default gen_random_uuid(),
  page_id uuid not null,
  version_number integer not null default 1,
  version_status text not null default 'draft' check (version_status in ('draft', 'published', 'archived', 'rollback')),
  page_snapshot jsonb not null default '{}'::jsonb,
  content_blocks_snapshot jsonb not null default '[]'::jsonb,
  seo_snapshot jsonb not null default '{}'::jsonb,
  schema_snapshot jsonb not null default '{}'::jsonb,
  change_summary text,
  rollback_from_version_id uuid,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_website_page_versions_page_number
  on public.website_page_versions(page_id, version_number);

create index if not exists idx_website_page_versions_page_id
  on public.website_page_versions(page_id);

create index if not exists idx_website_page_versions_status
  on public.website_page_versions(version_status);

alter table public.website_media_assets enable row level security;
alter table public.website_page_versions enable row level security;

grant select, insert, update, delete on public.website_media_assets to authenticated;
grant select, insert, update, delete on public.website_page_versions to authenticated;

comment on table public.website_media_assets is
  'V28.6.3.1 website_media_assets: Website CMS Media Library assets bound to pages and content blocks.';

comment on table public.website_page_versions is
  'V28.6.3.1 website_page_versions: Website CMS page version history, publish evidence and rollback snapshots.';

comment on column public.website_page_versions.version_status is
  'draft / published / archived / rollback workflow state for Website CMS versioning.';

-- Audit contract marker:
-- Website CMS edit / publish / rollback actions must write audit_logs.
-- Related modules: website_pages, website_content_blocks, website_media_assets, website_page_versions.
