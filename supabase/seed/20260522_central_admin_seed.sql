-- NANOFIX-V28 Central Admin Backend seed data
-- Safe sample records for local/staging verification. Replace emails/phones before production use.

insert into public.admin_profiles (admin_id, name, email, role, status)
values
  ('00000000-0000-0000-0000-000000000001', 'NANOFIX Super Admin', 'admin@nanofix.local', 'super_admin', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'NANOFIX Operations', 'operations@nanofix.local', 'operations_admin', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'NANOFIX Finance', 'finance@nanofix.local', 'finance', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'NANOFIX Engineer', 'engineer@nanofix.local', 'engineer', 'active')
on conflict (admin_id) do nothing;

insert into public.customers (customer_id, name, email, phone, whatsapp, status, tags)
values
  ('10000000-0000-0000-0000-000000000001', 'Mr Tan', 'tan@example.local', '+65 8123 4567', '+65 8123 4567', 'active', array['urgent-leak']),
  ('10000000-0000-0000-0000-000000000002', 'Lina Wong', 'lina@example.local', '+65 8765 4321', '+65 8765 4321', 'active', array['portal-user'])
on conflict (customer_id) do nothing;

insert into public.unified_intake (
  intake_id, source_platform, raw_message, extracted_data, priority, urgency_score, status
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'website_quick_repair',
    'Urgent ceiling leak above kitchen, photos uploaded.',
    '{"name":"Mr Tan","phone":"+65 8123 4567","issue_type":"ceiling leak","registration_mode":"quick_repair"}',
    'P0',
    95,
    'converted'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'customer_registration',
    'Bathroom seepage, wants portal tracking.',
    '{"name":"Lina Wong","phone":"+65 8765 4321","issue_type":"bathroom seepage","registration_mode":"registration_with_repair"}',
    'P1',
    72,
    'converted'
  )
on conflict (intake_id) do nothing;

insert into public.leads (
  lead_id, intake_id, customer_id, name, phone, email, address, source_platform,
  ai_extracted_data, binding_status, priority, urgency_score, status, owner_id
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    null,
    'Mr Tan',
    '+65 8123 4567',
    'tan@example.local',
    'Sample HDB address',
    'website_quick_repair',
    '{"issue_type":"ceiling leak","urgency_reason":"urgent leak"}',
    'pending',
    'P0',
    95,
    'qualified',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Lina Wong',
    '+65 8765 4321',
    'lina@example.local',
    'Sample condo address',
    'customer_registration',
    '{"issue_type":"bathroom seepage","tracking":"customer_portal"}',
    'linked',
    'P1',
    72,
    'converted',
    '00000000-0000-0000-0000-000000000002'
  )
on conflict (lead_id) do nothing;

insert into public.service_requests (
  service_request_id, intake_id, lead_id, customer_id, issue_type, address_text,
  postal_code, binding_status, priority, source_platform, status
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    null,
    'Ceiling leak',
    'Sample HDB address',
    '000000',
    'pending',
    'P0',
    'website_quick_repair',
    'pending_review'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Bathroom seepage',
    'Sample condo address',
    '000001',
    'linked',
    'P1',
    'customer_registration',
    'scheduled'
  )
on conflict (service_request_id) do nothing;
