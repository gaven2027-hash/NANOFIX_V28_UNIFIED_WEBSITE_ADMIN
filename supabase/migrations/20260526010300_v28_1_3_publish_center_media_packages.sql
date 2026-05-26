-- NANOFIX V28.1.3 Publish Center Media Package Enhancements
-- Adds media package support to the existing publish_center_items workflow.
-- Keeps the current final publish gate model and adds local upload / URL import / media library asset references.

alter table if exists public.publish_center_items
  add column if not exists media_assets_json jsonb not null default '[]'::jsonb;

alter table if exists public.publish_center_items
  add column if not exists media_source_summary text;

alter table if exists public.publish_center_items
  add column if not exists publish_package_json jsonb not null default '{}'::jsonb;

create index if not exists publish_center_items_media_assets_idx on public.publish_center_items using gin(media_assets_json);
create index if not exists publish_center_items_publish_package_idx on public.publish_center_items using gin(publish_package_json);

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
