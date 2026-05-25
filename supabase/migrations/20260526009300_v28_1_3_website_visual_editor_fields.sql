-- NANOFIX V28.1.3 Website Visual/GIF Editor Provider Fields
-- Adds selectable AI image/GIF editor provider metadata and same-position preview metadata to website CMS blocks.

alter table public.website_content_blocks
  add column if not exists visual_editor_provider text not null default 'nanofix_internal_visual_gif_editor',
  add column if not exists visual_asset_type text not null default 'image' check (visual_asset_type in ('image','gif','text_image','before_after','gallery','none')),
  add column if not exists visual_editor_status text not null default 'draft' check (visual_editor_status in ('draft','queued','editing','edited','failed','approved','manual_upload')),
  add column if not exists visual_prompt text,
  add column if not exists visual_template_id text,
  add column if not exists visual_model text,
  add column if not exists visual_output_url text,
  add column if not exists visual_output_storage_path text,
  add column if not exists visual_alt_text text,
  add column if not exists visual_preview_json jsonb not null default '{}'::jsonb,
  add column if not exists visual_cost_estimate numeric(12,4);

alter table public.website_content_blocks
  drop constraint if exists website_content_blocks_visual_editor_provider_check;

alter table public.website_content_blocks
  add constraint website_content_blocks_visual_editor_provider_check
  check (visual_editor_provider in (
    'nanofix_internal_visual_gif_editor',
    'canva_brand_template_editor',
    'adobe_firefly_express',
    'creatomate_visual_gif_api',
    'runway_image_gif_assist',
    'custom_visual_webhook_editor',
    'manual_final_asset_upload'
  ));

create index if not exists website_content_blocks_visual_editor_provider_idx on public.website_content_blocks(visual_editor_provider);
create index if not exists website_content_blocks_visual_editor_status_idx on public.website_content_blocks(visual_editor_status);
create index if not exists website_content_blocks_visual_asset_type_idx on public.website_content_blocks(visual_asset_type);
