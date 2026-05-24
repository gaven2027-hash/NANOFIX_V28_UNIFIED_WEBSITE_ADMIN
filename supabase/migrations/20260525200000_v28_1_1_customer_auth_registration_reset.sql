alter table public.customers add column if not exists username text;
alter table public.customers add column if not exists preferred_login_method text default 'email';
alter table public.customers add column if not exists email_verified boolean not null default false;
alter table public.customers add column if not exists phone_verified boolean not null default false;
alter table public.customers add column if not exists whatsapp_verified boolean not null default false;
alter table public.customers add column if not exists auth_methods jsonb not null default '{}'::jsonb;

create unique index if not exists customers_username_unique_idx on public.customers(lower(username)) where username is not null and username <> '';

create table if not exists public.customer_auth_actions (
  action_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id) on delete set null,
  auth_user_id uuid,
  username text,
  email text,
  phone text,
  whatsapp text,
  action_type text not null check (action_type in ('register_customer','direct_credential_update','email_recovery_link','whatsapp_recovery_link','email_verification','phone_verification','whatsapp_verification')),
  delivery_channel text not null default 'admin' check (delivery_channel in ('admin','email','phone','whatsapp')),
  status text not null default 'pending' check (status in ('pending','sent','completed','failed','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  requested_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_auth_actions enable row level security;

create index if not exists customer_auth_actions_customer_id_idx on public.customer_auth_actions(customer_id);
create index if not exists customer_auth_actions_auth_user_id_idx on public.customer_auth_actions(auth_user_id);
create index if not exists customer_auth_actions_username_idx on public.customer_auth_actions(username);
create index if not exists customer_auth_actions_action_type_idx on public.customer_auth_actions(action_type);
create index if not exists customer_auth_actions_status_idx on public.customer_auth_actions(status);
create index if not exists customer_auth_actions_created_at_idx on public.customer_auth_actions(created_at);
