-- NANOFIX V28.2 Service Operations Phase A.5
-- Inspection scheduling, engineer assignment, inspection form and upload review foundation.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.service_inspections (
  inspection_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  engineer_id uuid references public.profiles(profile_id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  location text,
  findings text,
  diagnosis text,
  recommended_action text,
  customer_present boolean not null default false,
  signature_required boolean not null default false,
  completed_at timestamptz,
  created_by uuid references public.profiles(profile_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_inspections_status_check check (status in ('scheduled','assigned','in_progress','completed','cancelled','needs_follow_up'))
);

create table if not exists public.service_upload_reviews (
  upload_review_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  job_id uuid references public.jobs(job_id) on delete set null,
  inspection_id uuid references public.service_inspections(inspection_id) on delete cascade,
  uploaded_by uuid references public.profiles(profile_id) on delete set null,
  file_name text not null,
  file_type text not null default 'image',
  storage_path text not null,
  review_status text not null default 'pending_review',
  review_notes text,
  reviewed_by uuid references public.profiles(profile_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_upload_reviews_status_check check (review_status in ('pending_review','approved','rejected','needs_redaction','archived')),
  constraint service_upload_reviews_file_type_check check (file_type in ('image','video','document','signature','other'))
);

create index if not exists service_inspections_request_idx on public.service_inspections(service_request_id, scheduled_at desc);
create index if not exists service_inspections_job_idx on public.service_inspections(job_id, scheduled_at desc);
create index if not exists service_inspections_engineer_idx on public.service_inspections(engineer_id, scheduled_at desc);
create index if not exists service_inspections_status_idx on public.service_inspections(status, scheduled_at desc);
create index if not exists service_upload_reviews_inspection_idx on public.service_upload_reviews(inspection_id, created_at desc);
create index if not exists service_upload_reviews_status_idx on public.service_upload_reviews(review_status, created_at desc);

drop trigger if exists service_inspections_touch_updated_at on public.service_inspections;
create trigger service_inspections_touch_updated_at before update on public.service_inspections for each row execute function public.nanofix_touch_updated_at();

drop trigger if exists service_upload_reviews_touch_updated_at on public.service_upload_reviews;
create trigger service_upload_reviews_touch_updated_at before update on public.service_upload_reviews for each row execute function public.nanofix_touch_updated_at();

alter table public.service_inspections enable row level security;
alter table public.service_upload_reviews enable row level security;

drop policy if exists "internal roles can read service inspections" on public.service_inspections;
create policy "internal roles can read service inspections" on public.service_inspections for select using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','finance','support','engineer')
  )
);

drop policy if exists "operations roles can write service inspections" on public.service_inspections;
create policy "operations roles can write service inspections" on public.service_inspections for all using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
);

drop policy if exists "internal roles can read upload reviews" on public.service_upload_reviews;
create policy "internal roles can read upload reviews" on public.service_upload_reviews for select using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
);

drop policy if exists "operations roles can write upload reviews" on public.service_upload_reviews;
create policy "operations roles can write upload reviews" on public.service_upload_reviews for all using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','support','engineer')
  )
);

grant select, insert, update on public.service_inspections to authenticated;
grant select, insert, update on public.service_upload_reviews to authenticated;
