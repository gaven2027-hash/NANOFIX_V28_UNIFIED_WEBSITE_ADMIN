-- NANOFIX V28.2 Customer Portal Phase D.1 revised
-- Customer Portal new repair / warranty repair submissions must enter the existing unified Service Operations queue.
-- These fields only label the origin/type; they do not create a separate customer-side document editing flow.

alter table public.service_requests
  add column if not exists request_origin text not null default 'public_website' check (request_origin in ('public_website','customer_portal','admin','phone','whatsapp','social','other')),
  add column if not exists customer_portal_request_type text check (customer_portal_request_type in ('new_repair','warranty_repair')),
  add column if not exists related_warranty_id uuid references public.warranties(warranty_id) on delete set null,
  add column if not exists portal_attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists portal_customer_notes text;

create index if not exists service_requests_origin_type_idx on public.service_requests(request_origin, customer_portal_request_type, status, created_at desc);
create index if not exists service_requests_related_warranty_idx on public.service_requests(related_warranty_id, created_at desc);

alter table public.leads
  add column if not exists request_origin text not null default 'public_website' check (request_origin in ('public_website','customer_portal','admin','phone','whatsapp','social','other')),
  add column if not exists customer_portal_request_type text check (customer_portal_request_type in ('new_repair','warranty_repair')),
  add column if not exists related_warranty_id uuid references public.warranties(warranty_id) on delete set null;

create index if not exists leads_origin_type_idx on public.leads(request_origin, customer_portal_request_type, status, created_at desc);
