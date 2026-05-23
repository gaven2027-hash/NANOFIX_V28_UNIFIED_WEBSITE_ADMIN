-- NANOFIX-V28 Central Admin Backend schema contract
-- Server-only APIs should use SUPABASE_SERVICE_ROLE_KEY. Public clients must rely on RLS.

create extension if not exists "pgcrypto";

create table if not exists public.admin_profiles (
  admin_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text unique not null,
  role text not null check (
    role in ('super_admin','admin','operations_admin','content_admin','ai_admin','finance_admin','support_admin','finance','support','engineer')
  ),
  status text not null default 'active' check (status in ('active','suspended','invited')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  customer_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  status text not null default 'active' check (status in ('active','pending_verification','suspended')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.unified_intake (
  intake_id uuid primary key default gen_random_uuid(),
  source_platform text not null check (
    source_platform in (
      'website_quick_repair','customer_registration','whatsapp','google_my_business',
      'website_live_chat','facebook','instagram','tiktok','youtube','xiaohongshu','manual'
    )
  ),
  raw_message text,
  extracted_data jsonb not null default '{}',
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3')),
  urgency_score integer not null default 0 check (urgency_score between 0 and 100),
  status text not null default 'new' check (status in ('new','reviewing','converted','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  lead_id uuid primary key default gen_random_uuid(),
  intake_id uuid references public.unified_intake(intake_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  source_platform text not null,
  ai_extracted_data jsonb not null default '{}',
  binding_status text not null default 'pending' check (binding_status in ('pending','linked','unlinked')),
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3')),
  urgency_score integer not null default 0 check (urgency_score between 0 and 100),
  status text not null default 'new' check (status in ('new','qualified','converted','duplicate','lost','archived')),
  owner_id uuid references public.admin_profiles(admin_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  service_request_id uuid primary key default gen_random_uuid(),
  intake_id uuid references public.unified_intake(intake_id) on delete set null,
  lead_id uuid references public.leads(lead_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  issue_type text not null,
  address_text text,
  postal_code text,
  binding_status text not null default 'pending' check (binding_status in ('pending','linked','unlinked')),
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3')),
  source_platform text not null,
  status text not null default 'pending_review' check (
    status in ('pending_review','scheduled','inspected','quoted','approved','cancelled')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.inspections (
  inspection_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(service_request_id) on delete cascade,
  engineer_id uuid references public.admin_profiles(admin_id) on delete set null,
  scheduled_at timestamptz,
  checklist_json jsonb not null default '{}',
  photo_paths text[] not null default '{}',
  status text not null default 'scheduled' check (
    status in ('scheduled','assigned','in_progress','completed','rescheduled','cancelled')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.quotations (
  quotation_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  version integer not null default 1,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'SGD',
  valid_until date,
  status text not null default 'draft' check (
    status in ('draft','sent','viewed','accepted','rejected','expired','revised','cancelled')
  ),
  approved_by uuid references public.admin_profiles(admin_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (service_request_id, version)
);

create table if not exists public.jobs (
  job_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  quotation_id uuid references public.quotations(quotation_id) on delete set null,
  engineer_id uuid references public.admin_profiles(admin_id) on delete set null,
  scheduled_at timestamptz,
  completion_notes text,
  before_photo_paths text[] not null default '{}',
  after_photo_paths text[] not null default '{}',
  customer_signature_path text,
  status text not null default 'assigned' check (
    status in ('assigned','en_route','arrived','in_progress','completed','rework_required','cancelled')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  invoice_id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  job_id uuid references public.jobs(job_id) on delete set null,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'SGD',
  due_date date,
  status text not null default 'draft' check (
    status in ('draft','issued','partially_paid','paid','overdue','void')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(invoice_id) on delete cascade,
  gateway text,
  transaction_id text unique,
  amount numeric(12,2) not null,
  currency text not null default 'SGD',
  status text not null default 'pending' check (
    status in ('pending','processing','succeeded','failed','refunded','partially_refunded')
  ),
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null,
  payment_id uuid references public.payments(payment_id) on delete set null,
  invoice_id uuid references public.invoices(invoice_id) on delete set null,
  status text not null default 'draft' check (status in ('draft','issued','corrected','void')),
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.warranties (
  warranty_id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  coverage text,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (
    status in ('active','expiring','expired','claim_opened','claim_approved','claim_rejected','resolved')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.content_drafts (
  content_id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('website','social')),
  platform text,
  title text,
  body text,
  prompt_version text,
  model text,
  source_references jsonb not null default '[]',
  approval_status text not null default 'draft' check (
    approval_status in ('draft','pending_review','approved','rejected','published','scheduled')
  ),
  reviewer_id uuid references public.admin_profiles(admin_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  audit_id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  object_type text not null,
  object_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_jobs (
  backup_id uuid primary key default gen_random_uuid(),
  module text not null,
  schedule_cron text,
  encrypted_file_path text,
  signed_url_expires_at timestamptz,
  status text not null default 'scheduled' check (
    status in ('scheduled','running','completed','failed','restored')
  ),
  created_by uuid references public.admin_profiles(admin_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pdpa_requests (
  request_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id) on delete set null,
  request_type text not null check (request_type in ('access','correction','deletion','breach_assessment')),
  status text not null default 'open' check (status in ('open','verifying','completed','rejected')),
  details text,
  owner_id uuid references public.admin_profiles(admin_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_unified_intake_priority_created on public.unified_intake(priority, created_at desc);
create index if not exists idx_leads_customer_status on public.leads(customer_id, status);
create index if not exists idx_service_requests_customer_status on public.service_requests(customer_id, status);
create index if not exists idx_jobs_engineer_status on public.jobs(engineer_id, status);
create index if not exists idx_invoices_customer_status on public.invoices(customer_id, status);
create index if not exists idx_audit_object on public.audit_logs(object_type, object_id, created_at desc);

alter table public.admin_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.unified_intake enable row level security;
alter table public.leads enable row level security;
alter table public.service_requests enable row level security;
alter table public.inspections enable row level security;
alter table public.quotations enable row level security;
alter table public.jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.warranties enable row level security;
alter table public.content_drafts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backup_jobs enable row level security;
alter table public.pdpa_requests enable row level security;

create policy "customers can read own profile"
  on public.customers for select
  using (auth.uid() = auth_user_id);

create policy "customers can read own service requests"
  on public.service_requests for select
  using (
    customer_id in (select customer_id from public.customers where auth_user_id = auth.uid())
  );

create policy "customers can read own invoices"
  on public.invoices for select
  using (
    customer_id in (select customer_id from public.customers where auth_user_id = auth.uid())
  );

create policy "engineers can read assigned jobs"
  on public.jobs for select
  using (
    engineer_id in (select admin_id from public.admin_profiles where auth_user_id = auth.uid())
  );

create policy "engineers can update assigned jobs"
  on public.jobs for update
  using (
    engineer_id in (select admin_id from public.admin_profiles where auth_user_id = auth.uid())
  );

-- Admin dashboard and server route writes should happen via service role only.
-- Add tighter role-specific admin policies when using Supabase Auth sessions in the admin UI.
