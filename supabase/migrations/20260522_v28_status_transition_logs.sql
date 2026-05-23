-- NANOFIX V28 unified status transition audit log.
-- Compatible superset used by both CG production hardening and GP transactional RPC.

create extension if not exists "pgcrypto";

create table if not exists public.status_transition_logs (
  transition_id uuid primary key default gen_random_uuid(),
  machine text,
  object_type text check (
    object_type is null or object_type in ('lead','service_request','inspection','quotation','job','invoice','payment','receipt','warranty')
  ),
  object_id uuid not null,
  from_status text,
  to_status text not null,
  reason text,
  actor_id uuid,
  actor_role text,
  ip_address inet,
  created_at timestamptz not null default now()
);

alter table public.status_transition_logs add column if not exists machine text;
alter table public.status_transition_logs add column if not exists object_type text;
alter table public.status_transition_logs add column if not exists ip_address inet;

create index if not exists idx_status_transition_logs_machine_object
  on public.status_transition_logs(machine, object_id, created_at desc);

create index if not exists idx_status_transition_logs_object_type_object
  on public.status_transition_logs(object_type, object_id, created_at desc);

alter table public.status_transition_logs enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='admin_profiles') then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'status_transition_logs'
        and policyname = 'admin read status transition logs'
    ) then
      create policy "admin read status transition logs"
        on public.status_transition_logs for select
        to authenticated
        using (
          exists (
            select 1
            from public.admin_profiles ap
            where ap.auth_user_id = auth.uid()
              and ap.status = 'active'
          )
        );
    end if;
  end if;
end $$;
