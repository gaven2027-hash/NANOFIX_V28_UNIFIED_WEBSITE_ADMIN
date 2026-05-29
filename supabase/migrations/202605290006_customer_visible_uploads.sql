-- NANOFIX V28.2 Service Operations Phase A.8
-- Customer Portal visibility controls for approved service upload reviews.

alter table public.service_upload_reviews
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists customer_visibility_notes text;

create index if not exists service_upload_reviews_customer_visible_idx
  on public.service_upload_reviews(visible_to_customer, review_status, created_at desc);
