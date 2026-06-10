-- NANOFIX V28.6.9.2
-- RLS static evidence and production policy alignment for core business tables.
-- This migration is intentionally idempotent: production already has the equivalent policies,
-- but the repository verifier also needs explicit migration evidence for these tables.

begin;

-- 1) Public website intake bridge / leads: admin-side internal roles only.
alter table public.unified_intake enable row level security;
drop policy if exists unified_intake_admin_all on public.unified_intake;
create policy unified_intake_admin_all
  on public.unified_intake
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','support','content_admin'])
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','support','content_admin'])
    )
  );

alter table public.leads enable row level security;
drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all
  on public.leads
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','support','content_admin'])
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','support','content_admin'])
    )
  );

-- 2) Quote version history: commercial roles only.
alter table public.quotation_versions enable row level security;
drop policy if exists quotation_versions_admin_all on public.quotation_versions;
create policy quotation_versions_admin_all
  on public.quotation_versions
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','finance','support'])
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','finance','support'])
    )
  );

-- 3) Audit logs: readable by trusted internal roles only. Writes continue through service-role server APIs.
alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
  on public.audit_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = any (array['super_admin','operations_admin','support'])
    )
  );

commit;
