-- NANOFIX V28.2 Phase D.4.6
-- Customer Portal Warranty Claim Message Thread
-- Customers can add messages to their own warranty claim. Internal Admin can reply without allowing customers to edit official documents.

create table if not exists public.warranty_claim_messages (
  message_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(service_request_id) on delete cascade,
  customer_id uuid references public.customers(customer_id) on delete set null,
  sender_profile_id uuid references public.profiles(profile_id) on delete set null,
  sender_type text not null check (sender_type in ('customer','internal')),
  sender_role text,
  message_body text not null check (char_length(message_body) between 1 and 2000),
  visible_to_customer boolean not null default true,
  internal_only boolean not null default false,
  read_by_customer_at timestamptz,
  read_by_internal_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warranty_claim_messages_request_idx
  on public.warranty_claim_messages(service_request_id, created_at asc);

create index if not exists warranty_claim_messages_customer_idx
  on public.warranty_claim_messages(customer_id, created_at desc)
  where customer_id is not null;

create index if not exists warranty_claim_messages_visible_idx
  on public.warranty_claim_messages(service_request_id, visible_to_customer, created_at asc);

alter table public.warranty_claim_messages enable row level security;

-- Runtime access goes through authenticated APIs using service role + explicit ownership checks.
-- RLS is still defined defensively for future direct client access.
drop policy if exists "customers can read own visible warranty claim messages" on public.warranty_claim_messages;
create policy "customers can read own visible warranty claim messages"
  on public.warranty_claim_messages
  for select
  using (
    visible_to_customer = true
    and exists (
      select 1 from public.customers c
      where c.customer_id = warranty_claim_messages.customer_id
      and c.profile_id = auth.uid()
      and c.account_status = 'active'
    )
  );

drop policy if exists "internal roles can read warranty claim messages" on public.warranty_claim_messages;
create policy "internal roles can read warranty claim messages"
  on public.warranty_claim_messages
  for select
  using (public.current_user_role() in ('super_admin','operations_admin','support','finance','engineer'));

drop policy if exists "internal roles can write warranty claim messages" on public.warranty_claim_messages;
create policy "internal roles can write warranty claim messages"
  on public.warranty_claim_messages
  for all
  using (public.current_user_role() in ('super_admin','operations_admin','support'))
  with check (public.current_user_role() in ('super_admin','operations_admin','support'));

grant select on public.warranty_claim_messages to authenticated;
grant all on public.warranty_claim_messages to service_role;
