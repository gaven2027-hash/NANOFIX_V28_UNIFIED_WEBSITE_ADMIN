create table if not exists public.portal_registration_requests (
  registration_request_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  profile_id uuid,
  email text not null,
  full_name text,
  phone text,
  requested_role text not null default 'customer',
  approved_role text,
  source text not null default 'portal_register',
  status text not null default 'pending_review',
  reviewer_notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists portal_registration_requests_email_role_active_uidx
  on public.portal_registration_requests(lower(email), requested_role)
  where status in ('pending_review','approved');

create index if not exists portal_registration_requests_status_role_idx
  on public.portal_registration_requests(status, requested_role, created_at);

create index if not exists portal_registration_requests_email_idx
  on public.portal_registration_requests(lower(email));

alter table public.portal_registration_requests enable row level security;

drop policy if exists portal_registration_requests_admin_all on public.portal_registration_requests;
create policy portal_registration_requests_admin_all
  on public.portal_registration_requests
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','support')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','support')
    )
  );
