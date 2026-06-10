-- NANOFIX V28.6.9.1
-- Supabase RPC / SECURITY DEFINER / search_path hardening.
-- Scope: tighten direct RPC execution on server-side transaction functions, keep policy-bound helpers usable by authenticated users,
-- and pin trigger helper search_path without resetting production data.

begin;

-- 1) Server-side transaction / trigger functions must not be callable directly by anon or ordinary authenticated users.
-- They are executed by triggers or server-side service_role API routes only.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.auto_generate_warranty_after_job_completion()',
    'public.close_warranty_claim_tx(uuid, uuid, text, text, text, text)',
    'public.confirm_warranty_claim_satisfaction_tx(uuid, uuid, text, integer, text)',
    'public.create_unified_task_with_inbox(text, text, text, text, text, text, text, timestamp with time zone, integer, text, text)',
    'public.review_warranty_claim_tx(uuid, text, text, uuid, text, text)',
    'public.route_warranty_claim_tx(uuid, text, text, uuid, text, text)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s set search_path = public, pg_temp', fn);
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('revoke execute on function %s from authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

-- 2) Touch/update trigger helpers should have a fixed search_path and no direct browser/API execution grants.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.warranty_pdf_documents_touch_updated_at()',
    'public.nanofix_touch_updated_at()',
    'public.payment_intents_touch_updated_at()',
    'public.payment_checkout_sessions_touch_updated_at()',
    'public.document_company_settings_touch_updated_at()',
    'public.customer_portal_requests_touch_updated_at()',
    'public.warranty_claims_touch_updated_at()'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s set search_path = public, pg_temp', fn);
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('revoke execute on function %s from authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

-- 3) Policy-bound helpers are still used by RLS policies. Do not revoke authenticated access in this batch.
-- Remove anonymous direct RPC access while keeping authenticated policy evaluation intact.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.current_user_role()',
    'public.owns_customer(uuid)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s set search_path = public, pg_temp', fn);
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('grant execute on function %s to authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

commit;
