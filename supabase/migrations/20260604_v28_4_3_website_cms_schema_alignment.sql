-- NANOFIX V28.4.3 Website CMS DB Schema Alignment
-- Purpose:
-- Align Website Management API expectations with the production CMS tables.
-- This migration is non-destructive: it only adds missing columns and indexes.
-- Do not reset the production database. Do not run migration repair blindly.

begin;

create table if not exists public.website_pages (
  page_id uuid primary key default gen_random_uuid(),
  locale text not null default 'en',
  title text not null default 'Untitled Website Page',
  meta_title text,
  meta_description text,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.website_pages
  add column if not exists slug text,
  add column if not exists locale text not null default 'en',
  add column if not exists title text not null default 'Untitled Website Page',
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.website_pages
set slug = lower(regexp_replace(coalesce(nullif(slug, ''), nullif(title, ''), page_id::text), '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists website_pages_locale_slug_uidx
  on public.website_pages(locale, slug)
  where slug is not null;

create index if not exists website_pages_status_idx on public.website_pages(status);
create index if not exists website_pages_updated_at_idx on public.website_pages(updated_at desc);

create table if not exists public.website_content_blocks (
  block_id uuid primary key default gen_random_uuid(),
  block_key text not null default 'homepage_content_block',
  locale text not null default 'en',
  title text not null default 'Untitled Content Block',
  body text not null default '',
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.website_content_blocks
  add column if not exists page_id uuid,
  add column if not exists block_key text not null default 'homepage_content_block',
  add column if not exists locale text not null default 'en',
  add column if not exists title text not null default 'Untitled Content Block',
  add column if not exists body text not null default '',
  add column if not exists status text not null default 'draft',
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'website_content_blocks_page_id_fkey'
      and conrelid = 'public.website_content_blocks'::regclass
  ) then
    alter table public.website_content_blocks
      add constraint website_content_blocks_page_id_fkey
      foreign key (page_id)
      references public.website_pages(page_id)
      on delete set null;
  end if;
end $$;

create index if not exists website_content_blocks_page_id_idx on public.website_content_blocks(page_id);
create index if not exists website_content_blocks_block_key_idx on public.website_content_blocks(block_key);
create index if not exists website_content_blocks_status_idx on public.website_content_blocks(status);
create index if not exists website_content_blocks_updated_at_idx on public.website_content_blocks(updated_at desc);

comment on table public.website_pages is 'NANOFIX Website Management CMS pages. V28.4.3 aligned with admin Website Management API.';
comment on column public.website_pages.slug is 'Public/CMS page slug used by Website Management and future public website rendering.';
comment on table public.website_content_blocks is 'NANOFIX Website Management CMS content blocks. V28.4.3 aligned with admin Website Management API.';
comment on column public.website_content_blocks.page_id is 'Optional link to website_pages.page_id. Nullable for global/homepage blocks.';

commit;
