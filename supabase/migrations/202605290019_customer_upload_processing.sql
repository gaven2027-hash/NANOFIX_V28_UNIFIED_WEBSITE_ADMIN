-- NANOFIX V28.2 Customer Portal Phase D.2
-- Customer upload processing for repair / warranty repair requests.
-- Images are client-compressed for clarity and convenience before upload.
-- Videos are validated and stored with processing metadata; true transcoding can be plugged in later.

create table if not exists public.customer_upload_assets (
  upload_asset_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  uploaded_by_profile_id uuid references public.profiles(profile_id) on delete set null,
  portal_request_id uuid references public.customer_portal_requests(portal_request_id) on delete set null,
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  storage_bucket text not null default 'service-uploads',
  storage_path text not null,
  original_file_name text,
  stored_file_name text,
  mime_type text not null,
  media_type text not null check (media_type in ('image','video')),
  original_size_bytes integer,
  processed_size_bytes integer,
  original_width integer,
  original_height integer,
  processed_width integer,
  processed_height integer,
  compression_status text not null default 'client_processed' check (compression_status in ('client_processed','stored_original','server_processing_pending','server_processing_failed')),
  compression_notes text,
  clarity_profile text not null default 'balanced_clear',
  checksum_hint text,
  upload_status text not null default 'uploaded' check (upload_status in ('uploaded','linked','rejected','deleted')),
  created_at timestamptz not null default now()
);

create index if not exists customer_upload_assets_customer_idx on public.customer_upload_assets(customer_id, created_at desc);
create index if not exists customer_upload_assets_portal_request_idx on public.customer_upload_assets(portal_request_id, created_at desc);
create index if not exists customer_upload_assets_service_request_idx on public.customer_upload_assets(service_request_id, created_at desc);
create index if not exists customer_upload_assets_media_idx on public.customer_upload_assets(media_type, upload_status, created_at desc);

alter table public.customer_upload_assets enable row level security;

drop policy if exists "customers can read own upload assets" on public.customer_upload_assets;
create policy "customers can read own upload assets"
on public.customer_upload_assets for select
using (public.owns_customer(customer_id));

drop policy if exists "internal roles can read customer upload assets" on public.customer_upload_assets;
create policy "internal roles can read customer upload assets"
on public.customer_upload_assets for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support','engineer'));

drop policy if exists "service role can write customer upload assets" on public.customer_upload_assets;
create policy "service role can write customer upload assets"
on public.customer_upload_assets for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

alter table public.customer_portal_requests
  add column if not exists upload_asset_ids uuid[] not null default array[]::uuid[];

alter table public.service_requests
  add column if not exists customer_upload_asset_ids uuid[] not null default array[]::uuid[];
