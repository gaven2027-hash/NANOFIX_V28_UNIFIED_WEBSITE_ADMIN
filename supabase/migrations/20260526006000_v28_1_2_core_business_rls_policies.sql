drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all
  on public.leads
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')));

drop policy if exists unified_intake_admin_all on public.unified_intake;
create policy unified_intake_admin_all
  on public.unified_intake
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')));

drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all
  on public.bookings
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists inspections_admin_all on public.inspections;
create policy inspections_admin_all
  on public.inspections
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists quotations_admin_all on public.quotations;
create policy quotations_admin_all
  on public.quotations
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','support')));

drop policy if exists quotation_versions_admin_all on public.quotation_versions;
create policy quotation_versions_admin_all
  on public.quotation_versions
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','support')));

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all
  on public.payments
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')));

drop policy if exists receipts_admin_all on public.receipts;
create policy receipts_admin_all
  on public.receipts
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')));

drop policy if exists warranties_admin_all on public.warranties;
create policy warranties_admin_all
  on public.warranties
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
  on public.audit_logs
  for select
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists website_pages_admin_all on public.website_pages;
create policy website_pages_admin_all
  on public.website_pages
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists website_content_blocks_admin_all on public.website_content_blocks;
create policy website_content_blocks_admin_all
  on public.website_content_blocks
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists social_messages_admin_all on public.social_messages;
create policy social_messages_admin_all
  on public.social_messages
  for all
  using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
  with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));
