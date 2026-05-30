-- NANOFIX V28.2 Phase D.2
-- Automatically generate warranty document after full repair completion.
-- Warranty years are taken from the accepted quotation snapshot.

create or replace function public.auto_generate_warranty_after_job_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acceptance public.quotation_acceptances%rowtype;
  v_years numeric(5,2);
  v_days integer;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(old.status, '') = coalesce(new.status, '') then
    return new;
  end if;

  if new.status not in ('completed','repair_completed','closed','done') then
    return new;
  end if;

  select * into v_acceptance
  from public.quotation_acceptances qa
  where qa.job_id = new.job_id
    and qa.acceptance_status = 'accepted'
  order by qa.created_at desc
  limit 1;

  if v_acceptance.acceptance_id is null then
    return new;
  end if;

  v_years := coalesce(v_acceptance.accepted_warranty_years, 0);
  if v_years <= 0 then
    return new;
  end if;

  if exists (
    select 1 from public.warranties w
    where w.job_id = new.job_id
      and w.source_acceptance_id = v_acceptance.acceptance_id
      and w.auto_generated = true
  ) then
    return new;
  end if;

  v_days := greatest(1, ceil(v_years * 365)::integer);

  insert into public.warranties (
    job_id,
    customer_id,
    status,
    coverage,
    starts_at,
    ends_at,
    warranty_years,
    source_quotation_id,
    source_acceptance_id,
    auto_generated,
    generation_source,
    generated_at,
    terms_snapshot,
    metadata_json
  ) values (
    new.job_id,
    coalesce(new.customer_id, v_acceptance.customer_id),
    'active',
    coalesce(v_acceptance.accepted_warranty_terms_snapshot, 'NANOFIX warranty coverage based on accepted quotation and completed scope of work.'),
    now(),
    now() + make_interval(days => v_days),
    v_years,
    v_acceptance.quotation_id,
    v_acceptance.acceptance_id,
    true,
    'job_completion',
    now(),
    v_acceptance.accepted_warranty_terms_snapshot,
    jsonb_build_object(
      'source', 'auto_generate_warranty_after_job_completion',
      'accepted_total', v_acceptance.accepted_total,
      'accepted_version', v_acceptance.accepted_version,
      'accepted_pdf_storage_path', v_acceptance.accepted_pdf_storage_path
    )
  );

  return new;
end;
$$;

drop trigger if exists auto_generate_warranty_after_job_completion on public.jobs;
create trigger auto_generate_warranty_after_job_completion
after update of status on public.jobs
for each row
execute function public.auto_generate_warranty_after_job_completion();

revoke all on function public.auto_generate_warranty_after_job_completion() from public;
