-- NANOFIX V28.1.3 Field Media Links
-- Connects media_assets to customer, service request, job and engineer field-work records.
-- This keeps customer uploads, engineer inspection photos/videos and service/job attachments in the unified media library.

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
  description text,
  tags text[] not null default '{}'::text[],
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','review_required','approved','rejected','archived','deleted')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.field_media_links enable row level security;

create index if not exists field_media_links_asset_id_idx on public.field_media_links(asset_id);
create index if not exists field_media_links_object_idx on public.field_media_links(object_type, object_id);
create index if not exists field_media_links_module_idx on public.field_media_links(module_key);
create index if not exists field_media_links_usage_context_idx on public.field_media_links(usage_context);
create index if not exists field_media_links_upload_stage_idx on public.field_media_links(upload_stage);
create index if not exists field_media_links_visibility_idx on public.field_media_links(visibility);
create index if not exists field_media_links_status_idx on public.field_media_links(status);
create index if not exists field_media_links_created_at_idx on public.field_media_links(created_at);
create index if not exists field_media_links_tags_idx on public.field_media_links using gin(tags);
create index if not exists field_media_links_metadata_idx on public.field_media_links using gin(metadata_json);

drop policy if exists field_media_links_admin_all on public.field_media_links;
create policy field_media_links_admin_all on public.field_media_links for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support','engineer')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support','engineer')));

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
