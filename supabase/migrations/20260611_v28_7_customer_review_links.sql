-- NANOFIX V28.7 Customer Review Link Settings
-- Purpose: allow Admin to maintain external review links that customer portal users can click.
-- Safety: idempotent migration; does not disable RLS and does not reset production data.

create extension if not exists pgcrypto;

create table if not exists public.customer_review_links (
  review_link_id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  label_en text not null,
  label_zh text not null,
  review_url text not null,
  help_text_en text,
  help_text_zh text,
  display_order integer not null default 100,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_review_links_provider_key_check check (provider_key ~ '^[a-z0-9_\-]+$'),
  constraint customer_review_links_url_check check (review_url ~* '^https?://')
);

alter table public.customer_review_links enable row level security;

create index if not exists idx_customer_review_links_active_order on public.customer_review_links(is_active, display_order, updated_at desc);
create index if not exists idx_customer_review_links_provider on public.customer_review_links(provider_key);

insert into public.customer_review_links(provider_key, label_en, label_zh, review_url, help_text_en, help_text_zh, display_order, is_active)
values
  ('google_review', 'Leave a Google Review', '我要评论 / Google 评价', 'https://www.google.com/search?q=NANOFIX+Singapore+review', 'Share your repair experience on Google.', '在 Google 分享您的维修体验。', 10, false),
  ('facebook_review', 'Leave a Facebook Review', 'Facebook 评价', 'https://www.facebook.com/profile.php?id=61583960398460', 'Review NANOFIX on Facebook if available.', '如 Facebook 页面支持评价，可在这里提交。', 20, false)
on conflict do nothing;

comment on table public.customer_review_links is 'Admin-managed external review links shown in Customer Portal. Only active http/https links should be exposed to customers.';
