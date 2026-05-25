-- NANOFIX V28.1.3 Social Platform Publish Handoff Queue Foundation
-- This table is the final admin-controlled handoff before any future social platform API publishing.
-- It does not publish by itself and must keep AI auto-publish disabled.

create table if not exists public.social_platform_publish_handoffs (
  handoff_id uuid primary key default gen_random_uuid(),
  version_id uuid references public.social_publish_versions(version_id) on delete cascade,
  render_job_id uuid references public.social_video_render_jobs(render_job_id) on delete set null,
  content_id uuid references public.content_drafts(content_id) on delete set null,
  platform text not null,
  handoff_status text not null default 'pending_final_approval' check (handoff_status in ('pending_final_approval','approved_for_manual_publish','manual_publish_required','published_recorded','rejected','cancelled','failed')),
  scheduled_at timestamptz,
  platform_payload jsonb not null default '{}'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  safety_json jsonb not null default '{"admin_review_required":true,"ai_auto_publish_allowed":false,"platform_api_called":false}'::jsonb,
  final_review_notes text,
  external_post_id text,
  external_post_url text,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_platform_publish_handoffs enable row level security;

create index if not exists social_platform_publish_handoffs_version_id_idx on public.social_platform_publish_handoffs(version_id);
create index if not exists social_platform_publish_handoffs_render_job_id_idx on public.social_platform_publish_handoffs(render_job_id);
create index if not exists social_platform_publish_handoffs_content_id_idx on public.social_platform_publish_handoffs(content_id);
create index if not exists social_platform_publish_handoffs_platform_idx on public.social_platform_publish_handoffs(platform);
create index if not exists social_platform_publish_handoffs_status_idx on public.social_platform_publish_handoffs(handoff_status);
create index if not exists social_platform_publish_handoffs_created_at_idx on public.social_platform_publish_handoffs(created_at desc);

drop policy if exists social_platform_publish_handoffs_admin_all on public.social_platform_publish_handoffs;

create policy social_platform_publish_handoffs_admin_all
on public.social_platform_publish_handoffs
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
