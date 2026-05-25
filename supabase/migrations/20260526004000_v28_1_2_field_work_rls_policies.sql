alter table public.nanofix_deployment_probe enable row level security;
alter table public.job_assignments enable row level security;
alter table public.job_checklists enable row level security;
alter table public.job_photos enable row level security;
alter table public.customer_signatures enable row level security;

drop policy if exists nanofix_deployment_probe_admin_all on public.nanofix_deployment_probe;
create policy nanofix_deployment_probe_admin_all
  on public.nanofix_deployment_probe
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

drop policy if exists job_assignments_admin_all on public.job_assignments;
create policy job_assignments_admin_all
  on public.job_assignments
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

drop policy if exists job_assignments_engineer_own on public.job_assignments;
create policy job_assignments_engineer_own
  on public.job_assignments
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.profile_id = job_assignments.engineer_id
        and p.is_active = true
        and p.role = 'engineer'
    )
  );

drop policy if exists job_assignments_engineer_status_update on public.job_assignments;
create policy job_assignments_engineer_status_update
  on public.job_assignments
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.profile_id = job_assignments.engineer_id
        and p.is_active = true
        and p.role = 'engineer'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.profile_id = job_assignments.engineer_id
        and p.is_active = true
        and p.role = 'engineer'
    )
  );

drop policy if exists job_checklists_admin_all on public.job_checklists;
create policy job_checklists_admin_all
  on public.job_checklists
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

drop policy if exists job_checklists_engineer_assigned on public.job_checklists;
create policy job_checklists_engineer_assigned
  on public.job_checklists
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and (
          p.profile_id = job_checklists.engineer_id
          or exists (
            select 1 from public.job_assignments ja
            where ja.job_id = job_checklists.job_id
              and ja.engineer_id = p.profile_id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and (
          p.profile_id = job_checklists.engineer_id
          or exists (
            select 1 from public.job_assignments ja
            where ja.job_id = job_checklists.job_id
              and ja.engineer_id = p.profile_id
          )
        )
    )
  );

drop policy if exists job_photos_admin_all on public.job_photos;
create policy job_photos_admin_all
  on public.job_photos
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

drop policy if exists job_photos_engineer_assigned on public.job_photos;
create policy job_photos_engineer_assigned
  on public.job_photos
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and (
          p.profile_id = job_photos.uploaded_by
          or exists (
            select 1 from public.job_assignments ja
            where ja.job_id = job_photos.job_id
              and ja.engineer_id = p.profile_id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and (
          p.profile_id = job_photos.uploaded_by
          or exists (
            select 1 from public.job_assignments ja
            where ja.job_id = job_photos.job_id
              and ja.engineer_id = p.profile_id
          )
        )
    )
  );

drop policy if exists customer_signatures_admin_all on public.customer_signatures;
create policy customer_signatures_admin_all
  on public.customer_signatures
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

drop policy if exists customer_signatures_engineer_assigned on public.customer_signatures;
create policy customer_signatures_engineer_assigned
  on public.customer_signatures
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and exists (
          select 1 from public.job_assignments ja
          where ja.job_id = customer_signatures.job_id
            and ja.engineer_id = p.profile_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'engineer'
        and exists (
          select 1 from public.job_assignments ja
          where ja.job_id = customer_signatures.job_id
            and ja.engineer_id = p.profile_id
        )
    )
  );
