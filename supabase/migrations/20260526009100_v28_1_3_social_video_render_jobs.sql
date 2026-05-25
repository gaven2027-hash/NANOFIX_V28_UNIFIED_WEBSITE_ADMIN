-- NANOFIX V28.1.3 Social Video Render Job Queue Foundation
-- This table stores admin-reviewed render job requests for future video rendering workers.
-- It is intentionally a queue/audit foundation, not an auto-publish mechanism.

create table if not exists public.social_video_render_jobs (
  render_job_id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_drafts(content_id) on delete set null,
  platform text not null default 'all',
  render_status text not null default 'draft' check (render_status in ('draft','queued','processing','rendered','failed','cancelled','approved','scheduled')),
  render_type text not null default 'short_video' check (render_type in ('short_video','long_video','story','reel','listing_video','blog_embed')),
  renderer_provider text not null default 'nanofix_internal_remotion_ffmpeg' check (renderer_provider in ('nanofix_internal_remotion_ffmpeg','creatomate_api','runway_api','custom_webhook_renderer','manual_final_video_upload')),
  renderer_template_id text,
  renderer_model text,
  renderer_endpoint_key text,
  renderer_cost_estimate numeric(12,4),
  title text not null,
  material_pack jsonb not null default '{}'::jsonb,
  render_settings jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text,
  admin_review_required boolean not null default true,
  ai_auto_publish_allowed boolean not null default false,
  requested_by uuid,
  approved_by uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_video_render_jobs
  add column if not exists renderer_provider text not null default 'nanofix_internal_remotion_ffmpeg',
  add column if not exists renderer_template_id text,
  add column if not exists renderer_model text,
  add column if not exists renderer_endpoint_key text,
  add column if not exists renderer_cost_estimate numeric(12,4);

alter table public.social_video_render_jobs
  drop constraint if exists social_video_render_jobs_renderer_provider_check;

alter table public.social_video_render_jobs
  add constraint social_video_render_jobs_renderer_provider_check
  check (renderer_provider in ('nanofix_internal_remotion_ffmpeg','creatomate_api','runway_api','custom_webhook_renderer','manual_final_video_upload'));

alter table public.social_video_render_jobs enable row level security;

create index if not exists social_video_render_jobs_content_id_idx on public.social_video_render_jobs(content_id);
create index if not exists social_video_render_jobs_platform_idx on public.social_video_render_jobs(platform);
create index if not exists social_video_render_jobs_render_status_idx on public.social_video_render_jobs(render_status);
create index if not exists social_video_render_jobs_renderer_provider_idx on public.social_video_render_jobs(renderer_provider);
create index if not exists social_video_render_jobs_requested_by_idx on public.social_video_render_jobs(requested_by);
create index if not exists social_video_render_jobs_created_at_idx on public.social_video_render_jobs(created_at desc);

drop policy if exists social_video_render_jobs_admin_all on public.social_video_render_jobs;

create policy social_video_render_jobs_admin_all
on public.social_video_render_jobs
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
