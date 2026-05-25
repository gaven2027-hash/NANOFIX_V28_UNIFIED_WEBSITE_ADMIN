create table if not exists public.social_accounts (
  social_account_id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text not null,
  account_handle text,
  account_url text,
  business_id text,
  page_id text,
  app_id text,
  connection_status text not null default 'draft',
  is_active boolean not null default true,
  webhook_url text,
  api_base_url text,
  access_token_secret_name text,
  refresh_token_secret_name text,
  token_expires_at timestamptz,
  permissions_json jsonb not null default '[]'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  notes text,
  last_connected_at timestamptz,
  last_checked_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_accounts_platform_handle_uidx
  on public.social_accounts(platform, lower(coalesce(account_handle, account_name)))
  where account_handle is not null or account_name is not null;

create index if not exists social_accounts_platform_status_idx
  on public.social_accounts(platform, connection_status, is_active, created_at);

alter table public.social_accounts enable row level security;

drop policy if exists social_accounts_admin_all on public.social_accounts;
create policy social_accounts_admin_all
  on public.social_accounts
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','content_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','content_admin')
    )
  );
