create table if not exists public.field_media_links (
  link_id uuid primary key default gen_random_uuid(),
  asset_id uuid,
  object_type text not null,
  object_id uuid,
  reference_label text,
  module_key text not null default 'field_operations',
  usage_context text not null default 'field_attachment',
  upload_stage text not null default 'general',
  visibility text not null default 'admin_internal',
  allowed_view_roles text[] not null default '{}'::text[],
  allowed_use_roles text[] not null default '{}'::text[],
  allowed_view_actor_ids uuid[] not null default '{}'::uuid[],
  denied_view_actor_ids uuid[] not null default '{}'::uuid[],
  allowed_use_actor_ids uuid[] not null default '{}'::uuid[],
  denied_use_actor_ids uuid[] not null default '{}'::uuid[],
  access_policy_json jsonb not null default '{}'::jsonb,
  description text,
  tags text[] not null default '{}'::text[],
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.field_media_links add column if not exists allowed_view_roles text[] not null default '{}'::text[];
alter table public.field_media_links add column if not exists allowed_use_roles text[] not null default '{}'::text[];
alter table public.field_media_links add column if not exists allowed_view_actor_ids uuid[] not null default '{}'::uuid[];
alter table public.field_media_links add column if not exists denied_view_actor_ids uuid[] not null default '{}'::uuid[];
alter table public.field_media_links add column if not exists allowed_use_actor_ids uuid[] not null default '{}'::uuid[];
alter table public.field_media_links add column if not exists denied_use_actor_ids uuid[] not null default '{}'::uuid[];
alter table public.field_media_links add column if not exists access_policy_json jsonb not null default '{}'::jsonb;

create index if not exists field_media_links_object_idx on public.field_media_links(object_type, object_id);
create index if not exists field_media_links_view_roles_idx on public.field_media_links using gin(allowed_view_roles);
create index if not exists field_media_links_use_roles_idx on public.field_media_links using gin(allowed_use_roles);
create index if not exists field_media_links_view_people_idx on public.field_media_links using gin(allowed_view_actor_ids);
create index if not exists field_media_links_use_people_idx on public.field_media_links using gin(allowed_use_actor_ids);
