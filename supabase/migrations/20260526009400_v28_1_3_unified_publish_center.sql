-- NANOFIX V28.1.3 Unified Publish Center
-- Final human-controlled publishing outlet for Website and Social content.
-- AI must not auto-publish. Approval must be completed before scheduling.

create table if not exists public.publish_center_items (
  publish_item_id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('website','social')),
  source_type text not null default 'manual_upload' check (source_type in ('ai_generated','manual_upload','external_editor','canva','capcut','premiere','mobile_upload','website_cms','social_rendered_video')),
  source_id uuid,
  title text not null,
  platform text not null default 'website',
  route_path text,
  content_url text,
  thumbnail_url text,
  caption text,
  final_asset_url text,
  final_asset_storage_path text,
  status text not null default 'ready_to_publish' check (status in ('ready_to_publish','scheduled','publishing','published','failed','pushed_back_to_review','cancelled')),
  approval_status text not null default 'approved' check (approval_status in ('approved','not_approved','needs_review')),
  final_publish_gate jsonb not null default '{}'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
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

alter table public.publish_center_items enable row level security;

create index if not exists publish_center_items_module_idx on public.publish_center_items(module);
create index if not exists publish_center_items_status_idx on public.publish_center_items(status);
create index if not exists publish_center_items_platform_idx on public.publish_center_items(platform);
create index if not exists publish_center_items_scheduled_at_idx on public.publish_center_items(scheduled_at);
create index if not exists publish_center_items_source_idx on public.publish_center_items(source_type, source_id);

create or replace function public.prevent_publish_center_ai_auto_publish()
returns trigger
language plpgsql
as $$
begin
  if new.ai_auto_publish_allowed is true then
    raise exception 'NANOFIX Publish Center: AI auto-publish is disabled by default.';
  end if;
  if new.status in ('scheduled','publishing','published') and coalesce(new.final_approval_completed_before_schedule, false) is not true then
    raise exception 'NANOFIX Publish Center: final approval must be completed before scheduling or publishing.';
  end if;
  if new.status in ('scheduled','publishing','published') and new.approval_status <> 'approved' then
    raise exception 'NANOFIX Publish Center: item must be approved before scheduling or publishing.';
  end if;
  if new.status in ('scheduled','published') then
    new.publish_ready_after_schedule := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_publish_center_ai_auto_publish on public.publish_center_items;
create trigger trg_prevent_publish_center_ai_auto_publish
before insert or update on public.publish_center_items
for each row execute function public.prevent_publish_center_ai_auto_publish();

drop policy if exists publish_center_admin_all on public.publish_center_items;
create policy publish_center_admin_all
on public.publish_center_items
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin','admin','manager','editor')
  )
);
