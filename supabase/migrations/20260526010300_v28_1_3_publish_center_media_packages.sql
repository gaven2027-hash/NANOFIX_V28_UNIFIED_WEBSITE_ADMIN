-- NANOFIX V28.1.3 Publish Center Media Package Enhancements
-- Adds media package support to the existing publish_center_items workflow.
-- Keeps the current final publish gate model and adds local upload / URL import / media library asset references.

create table if not exists public.publish_center_items (
  publish_item_id uuid primary key default gen_random_uuid(),
  module text not null default 'website' check (module in ('website','social')),
  source_type text not null default 'manual_upload' check (source_type in ('ai_generated','manual_upload','external_editor','canva','capcut','premiere','mobile_upload','website_cms','social_rendered_video','media_library_package')),
  source_id uuid,
  title text not null default 'NANOFIX publish item',
  platform text not null default 'website',
  route_path text,
  content_url text,
  thumbnail_url text,
  caption text,
  final_asset_url text,
  final_asset_storage_path text,
  status text not null default 'ready_to_publish' check (status in ('ready_to_publish','scheduled','publishing','published','failed','pushed_back_to_review','cancelled')),
  approval_status text not null default 'approved',
  final_publish_gate jsonb not null default '{}'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  media_assets_json jsonb not null default '[]'::jsonb,
  media_source_summary text,
  publish_package_json jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_by uuid,
  updated_by uuid,
  error_message text,
  ai_auto_publish_allowed boolean not null default false,
  final_approval_completed_before_schedule boolean not null default true,
  publish_ready_after_schedule boolean not null default false,
  platform_api_called boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.publish_center_items
  add column if not exists media_assets_json jsonb not null default '[]'::jsonb;

alter table public.publish_center_items
  add column if not exists media_source_summary text;

alter table public.publish_center_items
  add column if not exists publish_package_json jsonb not null default '{}'::jsonb;

alter table public.publish_center_items enable row level security;

create index if not exists publish_center_items_module_idx on public.publish_center_items(module);
create index if not exists publish_center_items_status_idx on public.publish_center_items(status);
create index if not exists publish_center_items_platform_idx on public.publish_center_items(platform);
create index if not exists publish_center_items_scheduled_at_idx on public.publish_center_items(scheduled_at);
create index if not exists publish_center_items_created_at_idx on public.publish_center_items(created_at);
create index if not exists publish_center_items_media_assets_idx on public.publish_center_items using gin(media_assets_json);
create index if not exists publish_center_items_publish_package_idx on public.publish_center_items using gin(publish_package_json);

drop policy if exists publish_center_items_admin_all on public.publish_center_items;
create policy publish_center_items_admin_all on public.publish_center_items for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

grant select, insert, update on public.publish_center_items to authenticated;

create or replace function public.nanofix_publish_center_item_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists publish_center_item_timestamp_trigger on public.publish_center_items;
create trigger publish_center_item_timestamp_trigger
before insert or update on public.publish_center_items
for each row execute function public.nanofix_publish_center_item_timestamp();

-- Optional standalone package table for future cross-module publish bundles.
create table if not exists public.publish_center_packages (
  package_id uuid primary key default gen_random_uuid(),
  module_key text not null default 'publish_center',
  publish_scope text not null default 'multi_channel' check (publish_scope in ('website','social','message_reply','campaign','multi_channel','system')),
  title text not null,
  body text,
  target_channels text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft','pending_review','approved','scheduled','published','rejected','archived','failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  content_json jsonb not null default '{}'::jsonb,
  media_assets_json jsonb not null default '[]'::jsonb,
  approval_json jsonb not null default '{}'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  published_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.publish_center_packages enable row level security;

create index if not exists publish_center_packages_scope_idx on public.publish_center_packages(publish_scope);
create index if not exists publish_center_packages_status_idx on public.publish_center_packages(status);
create index if not exists publish_center_packages_scheduled_at_idx on public.publish_center_packages(scheduled_at);
create index if not exists publish_center_packages_created_at_idx on public.publish_center_packages(created_at);
create index if not exists publish_center_packages_target_channels_idx on public.publish_center_packages using gin(target_channels);
create index if not exists publish_center_packages_media_assets_idx on public.publish_center_packages using gin(media_assets_json);

drop policy if exists publish_center_packages_admin_all on public.publish_center_packages;
create policy publish_center_packages_admin_all on public.publish_center_packages for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

grant select, insert, update on public.publish_center_packages to authenticated;

create or replace function public.nanofix_publish_center_package_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists publish_center_package_timestamp_trigger on public.publish_center_packages;
create trigger publish_center_package_timestamp_trigger
before insert or update on public.publish_center_packages
for each row execute function public.nanofix_publish_center_package_timestamp();
