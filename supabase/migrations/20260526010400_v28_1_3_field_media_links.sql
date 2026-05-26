-- NANOFIX V28.1.3 Field Media Links
-- Connects media_assets to customer, service request, job and engineer field-work records.
-- Direct customer/engineer reads are intentionally NOT granted.
-- Admin backend search is filtered by role/person ACL: allowed_view_roles + allowed_view_actor_ids.

alter table if exists public.profiles
  add column if not exists display_name text;

alter table if exists public.profiles
  add column if not exists email text;

create table if not exists public.field_media_links (
  link_id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(asset_id) on delete cascade,
  object_type text not null check (object_type in ('customer','lead','service_request','job','engineer_inspection','quotation','invoice','payment','warranty','material','supplier','other')),
  object_id uuid,
  reference_label text,
  module_key text not null default 'field_operations',
  usage_context text not null default 'field_attachment',
  upload_stage text not null default 'general' check (upload_stage in ('customer_before_submit','intake_review','engineer_before','engineer_during','engineer_after','quotation_support','invoice_support','warranty_proof','payment_proof','general')),
  visibility text not null default 'admin_internal' check (visibility in ('admin_internal','customer_visible','engineer_visible','public_approved')),
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
  status text not null default 'active' check (status in ('active','review_required','approved','rejected','archived','deleted')),
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

alter table public.field_media_links enable row level security;

create index if not exists field_media_links_asset_id_idx on public.field_media_links(asset_id);
create index if not exists field_media_links_object_idx on public.field_media_links(object_type, object_id);
create index if not exists field_media_links_module_idx on public.field_media_links(module_key);
create index if not exists field_media_links_usage_context_idx on public.field_media_links(usage_context);
create index if not exists field_media_links_upload_stage_idx on public.field_media_links(upload_stage);
create index if not exists field_media_links_visibility_idx on public.field_media_links(visibility);
create index if not exists field_media_links_allowed_view_roles_idx on public.field_media_links using gin(allowed_view_roles);
create index if not exists field_media_links_allowed_use_roles_idx on public.field_media_links using gin(allowed_use_roles);
create index if not exists field_media_links_allowed_view_actor_ids_idx on public.field_media_links using gin(allowed_view_actor_ids);
create index if not exists field_media_links_denied_view_actor_ids_idx on public.field_media_links using gin(denied_view_actor_ids);
create index if not exists field_media_links_allowed_use_actor_ids_idx on public.field_media_links using gin(allowed_use_actor_ids);
create index if not exists field_media_links_denied_use_actor_ids_idx on public.field_media_links using gin(denied_use_actor_ids);
create index if not exists field_media_links_access_policy_idx on public.field_media_links using gin(access_policy_json);
create index if not exists field_media_links_status_idx on public.field_media_links(status);
create index if not exists field_media_links_created_at_idx on public.field_media_links(created_at);
create index if not exists field_media_links_tags_idx on public.field_media_links using gin(tags);
create index if not exists field_media_links_metadata_idx on public.field_media_links using gin(metadata_json);

drop policy if exists field_media_links_admin_all on public.field_media_links;
create policy field_media_links_admin_all on public.field_media_links for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support','finance')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support','finance')));

-- Customer and engineer portals must not read this table directly.
-- allowed_view_roles / allowed_view_actor_ids are enforced in admin API search/read responses.
-- allowed_use_roles / allowed_use_actor_ids are used before a media asset can be attached to finance, report, AI, publish or other workflows.
grant select, insert, update on public.field_media_links to authenticated;

create or replace function public.nanofix_field_media_link_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists field_media_link_timestamp_trigger on public.field_media_links;
create trigger field_media_link_timestamp_trigger
before insert or update on public.field_media_links
for each row execute function public.nanofix_field_media_link_timestamp();
