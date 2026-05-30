-- NANOFIX V28.2 Phase D.3 compatibility
-- Align warranty_pdf_documents table with the existing admin warranty PDF API.

alter table public.warranty_pdf_documents
  add column if not exists storage_bucket text not null default 'service-uploads',
  add column if not exists file_name text,
  add column if not exists mime_type text not null default 'application/pdf',
  add column if not exists file_size_bytes bigint not null default 0,
  add column if not exists checksum_sha256 text,
  add column if not exists generation_status text not null default 'generated' check (generation_status in ('generated','superseded','revoked','failed','pending')),
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists generation_notes text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists warranty_pdf_documents_status_idx on public.warranty_pdf_documents(warranty_id, generation_status, warranty_version desc);
create index if not exists warranty_pdf_documents_customer_visible_status_idx on public.warranty_pdf_documents(customer_id, visible_to_customer, generation_status, generated_at desc);

create or replace function public.warranty_pdf_documents_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists warranty_pdf_documents_touch_updated_at on public.warranty_pdf_documents;
create trigger warranty_pdf_documents_touch_updated_at
before update on public.warranty_pdf_documents
for each row execute function public.warranty_pdf_documents_touch_updated_at();
