-- NANOFIX V28.1.3 AI Media Links
-- Connects media_assets to AI analysis, material suggestion, quotation assistance, invoice assistance and report generation workflows.

create table if not exists public.ai_media_links (
  link_id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(asset_id) on delete cascade,
  ai_module text not null default 'general_ai' check (ai_module in ('general_ai','ai_analysis','material_suggestion','quotation_assistant','invoice_assistant','report_generator','risk_detection','seo_aeo_ai','social_ai','web_search_ai')),
  object_type text not null default 'ai_context' check (object_type in ('ai_context','lead','service_request','job','inspection','quotation','invoice','material','supplier','report','website_content','social_content','other')),
  object_id uuid,
  reference_label text,
  usage_context text not null default 'ai_attachment' check (usage_context in ('ai_attachment','analysis_input','evidence_photo','inspection_video','material_reference','price_reference','quotation_reference','invoice_reference','report_source','seo_source','social_source','training_reference')),
  ai_readiness_status text not null default 'pending_review' check (ai_readiness_status in ('pending_review','approved_for_ai','blocked_for_ai','used_in_ai','archived')),
  privacy_scope text not null default 'internal_only' check (privacy_scope in ('internal_only','customer_visible','engineer_visible','public_source','sensitive_restricted')),
  ai_prompt_hint text,
  ai_summary text,
  extraction_json jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','review_required','approved','rejected','archived','deleted')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_media_links enable row level security;

create index if not exists ai_media_links_asset_id_idx on public.ai_media_links(asset_id);
create index if not exists ai_media_links_ai_module_idx on public.ai_media_links(ai_module);
create index if not exists ai_media_links_object_idx on public.ai_media_links(object_type, object_id);
create index if not exists ai_media_links_usage_context_idx on public.ai_media_links(usage_context);
create index if not exists ai_media_links_ai_readiness_idx on public.ai_media_links(ai_readiness_status);
create index if not exists ai_media_links_privacy_scope_idx on public.ai_media_links(privacy_scope);
create index if not exists ai_media_links_status_idx on public.ai_media_links(status);
create index if not exists ai_media_links_created_at_idx on public.ai_media_links(created_at);
create index if not exists ai_media_links_tags_idx on public.ai_media_links using gin(tags);
create index if not exists ai_media_links_extraction_idx on public.ai_media_links using gin(extraction_json);
create index if not exists ai_media_links_metadata_idx on public.ai_media_links using gin(metadata_json);

drop policy if exists ai_media_links_admin_all on public.ai_media_links;
create policy ai_media_links_admin_all on public.ai_media_links for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

grant select, insert, update on public.ai_media_links to authenticated;

create or replace function public.nanofix_ai_media_link_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ai_media_link_timestamp_trigger on public.ai_media_links;
create trigger ai_media_link_timestamp_trigger
before insert or update on public.ai_media_links
for each row execute function public.nanofix_ai_media_link_timestamp();
