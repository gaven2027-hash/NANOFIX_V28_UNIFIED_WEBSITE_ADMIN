-- NANOFIX V28.2 Customer Portal Phase D.1
-- Customer Portal submissions are source channels only.
-- New repair and warranty repair must still enter the original service_requests / Service Operations workflow.
-- Quotes, invoices and warranty documents remain admin-generated from templates; customers can only leave feedback.

create table if not exists public.customer_portal_requests (
  portal_request_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  submitted_by_profile_id uuid references public.profiles(profile_id) on delete set null,
  request_type text not null check (request_type in ('new_repair','warranty_repair')),
  related_warranty_id uuid references public.warranties(warranty_id) on delete set null,
  related_job_id uuid references public.jobs(job_id) on delete set null,
  title text not null,
  issue_location text,
  issue_description text not null,
  preferred_schedule text,
  contact_name text,
  contact_phone text,
  contact_email text,
  attachment_urls jsonb not null default '[]'::jsonb,
  status text not null default 'submitted_to_service_operations' check (status in ('submitted_to_service_operations','reviewing','converted_to_job','resolved','rejected','cancelled')),
  created_service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  internal_notes text,
  reviewed_by uuid references public.profiles(profile_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_document_feedback (
  feedback_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  submitted_by_profile_id uuid references public.profiles(profile_id) on delete set null,
  document_type text not null check (document_type in ('quotation','invoice','warranty','payment','other')),
  document_id uuid,
  related_job_id uuid references public.jobs(job_id) on delete set null,
  feedback_type text not null default 'comment' check (feedback_type in ('comment','change_request','dispute','clarification')),
  message text not null,
  status text not null default 'submitted' check (status in ('submitted','reviewing','resolved','rejected','superseded')),
  internal_response text,
  reviewed_by uuid references public.profiles(profile_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.service_requests
  add column if not exists customer_portal_request_id uuid references public.customer_portal_requests(portal_request_id) on delete set null,
  add column if not exists portal_source_type text,
  add column if not exists portal_related_warranty_id uuid references public.warranties(warranty_id) on delete set null,
  add column if not exists customer_submission_json jsonb not null default '{}'::jsonb,
  add column if not exists customer_attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists customer_feedback_notes text;

create index if not exists customer_portal_requests_customer_idx on public.customer_portal_requests(customer_id, created_at desc);
create index if not exists customer_portal_requests_type_status_idx on public.customer_portal_requests(request_type, status, created_at desc);
create index if not exists customer_portal_requests_warranty_idx on public.customer_portal_requests(related_warranty_id, created_at desc);
create index if not exists service_requests_customer_portal_request_idx on public.service_requests(customer_portal_request_id, created_at desc);
create index if not exists service_requests_portal_source_idx on public.service_requests(portal_source_type, created_at desc);
create index if not exists customer_document_feedback_customer_idx on public.customer_document_feedback(customer_id, created_at desc);
create index if not exists customer_document_feedback_document_idx on public.customer_document_feedback(document_type, document_id, created_at desc);
create index if not exists customer_document_feedback_status_idx on public.customer_document_feedback(status, created_at desc);

create or replace function public.customer_portal_requests_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_portal_requests_touch_updated_at on public.customer_portal_requests;
create trigger customer_portal_requests_touch_updated_at
before update on public.customer_portal_requests
for each row execute function public.customer_portal_requests_touch_updated_at();

alter table public.customer_portal_requests enable row level security;
alter table public.customer_document_feedback enable row level security;

drop policy if exists "customers can read own portal requests" on public.customer_portal_requests;
create policy "customers can read own portal requests"
on public.customer_portal_requests for select
using (public.owns_customer(customer_id));

drop policy if exists "internal roles can read customer portal requests" on public.customer_portal_requests;
create policy "internal roles can read customer portal requests"
on public.customer_portal_requests for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support','engineer'));

drop policy if exists "service role can write customer portal requests" on public.customer_portal_requests;
create policy "service role can write customer portal requests"
on public.customer_portal_requests for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "customers can read own document feedback" on public.customer_document_feedback;
create policy "customers can read own document feedback"
on public.customer_document_feedback for select
using (public.owns_customer(customer_id));

drop policy if exists "internal roles can read customer document feedback" on public.customer_document_feedback;
create policy "internal roles can read customer document feedback"
on public.customer_document_feedback for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support','engineer'));

drop policy if exists "service role can write customer document feedback" on public.customer_document_feedback;
create policy "service role can write customer document feedback"
on public.customer_document_feedback for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
