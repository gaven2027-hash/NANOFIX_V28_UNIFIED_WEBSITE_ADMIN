-- NANOFIX V28.4.4 Website CMS Real Content Seed & Publish Workflow
-- V28.4.4.3 Final Website CMS Seed Hotfix
-- Compatible with production website_pages and website_content_blocks NOT NULL columns.
-- Non-destructive and idempotent: uses indexes + upsert, does not delete existing content.
-- Do not reset the production database. Do not run migration repair blindly.

begin;

alter table public.website_pages
  add column if not exists slug text,
  add column if not exists route_path text,
  add column if not exists locale text not null default 'en',
  add column if not exists title text not null default 'Untitled Website Page',
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.website_content_blocks
  add column if not exists page_id uuid,
  add column if not exists route_path text,
  add column if not exists block_key text not null default 'homepage_content_block',
  add column if not exists content_type text not null default 'cms_block',
  add column if not exists content_json jsonb not null default '{}'::jsonb,
  add column if not exists locale text not null default 'en',
  add column if not exists title text not null default 'Untitled Content Block',
  add column if not exists body text not null default '',
  add column if not exists status text not null default 'draft',
  add column if not exists published_version integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists website_pages_locale_slug_uidx
  on public.website_pages(locale, slug)
  where slug is not null;

create unique index if not exists website_content_blocks_page_locale_key_uidx
  on public.website_content_blocks(page_id, locale, block_key)
  where page_id is not null;

with page_seed(slug, route_path, locale, title, meta_title, meta_description, status, published_at) as (
  values
    ('home', '/', 'en', 'NANOFIX Singapore No-Hacking Leak Repair & Waterproofing', 'NANOFIX Singapore | No-Hacking Leak Repair & Waterproofing', 'Premium no-hacking leak repair, leak detection, PU injection, waterproofing and repair tracking for HDB, condo, commercial and industrial properties in Singapore.', 'published', now()),
    ('leak-detection', '/leak-detection', 'en', 'Leak Detection Services', 'Leak Detection Singapore | Thermal, CCTV, Drone & Pipe Diagnosis', 'Find hidden water leaks with thermal imaging, robotic CCTV, drone facade inspection, inter-floor leak diagnosis and concealed pipe detection.', 'published', now()),
    ('no-hacking-repair', '/no-hacking-repair', 'en', 'No-Hacking Leak Repair', 'No-Hacking Leak Repair Singapore | PU Injection & Tile Grouting', 'Repair toilet, ceiling, wall and floor leakage with no-hacking injection, clear penetrating treatment and epoxy tile grouting solutions.', 'published', now()),
    ('waterproofing-works', '/waterproofing-works', 'en', 'Waterproofing Works', 'Waterproofing Contractor Singapore | Roof, Wall, Balcony & Planter Box', 'Commercial, industrial and residential waterproofing for RC roofs, metal roofs, external walls, balconies and planter boxes.', 'published', now()),
    ('track-record-warranty', '/track-record-warranty', 'en', 'Track Record & Warranty', 'NANOFIX Track Record & Warranty | Repair Tracking & E-Warranty', 'View NANOFIX service warranty terms, project categories, customer repair tracking and e-warranty management workflow.', 'published', now()),
    ('guide', '/guide', 'en', 'Water Leak Guide & FAQs', 'Water Leak Diagnosis Guide Singapore | No-Hacking Repair FAQs', 'Helpful guides, FAQs, diagnosis tips and post-repair care for Singapore water leakage, waterproofing and no-hacking repair.', 'published', now()),
    ('free-quote', '/free-quote', 'en', 'Get a Free Quote', 'Get a Free Quote | NANOFIX Leak Repair Singapore', 'Submit leakage photos, book a site inspection, request a WhatsApp consultation or contact NANOFIX Singapore for fast repair advice.', 'published', now())
)
insert into public.website_pages (
  slug, route_path, locale, title, meta_title, meta_description, status, published_at, created_at, updated_at
)
select slug, route_path, locale, title, meta_title, meta_description, status, published_at, now(), now()
from page_seed
on conflict (locale, slug) where slug is not null do update
set route_path = excluded.route_path,
    title = excluded.title,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description,
    status = excluded.status,
    published_at = coalesce(public.website_pages.published_at, excluded.published_at),
    updated_at = now();

with block_seed(slug, route_path, block_key, content_type, locale, title, body, status, sort_order) as (
  values
    ('home', '/', 'hero', 'hero', 'en', 'Premium No-Hacking Leak Repair in Singapore', 'NANOFIX helps homeowners, MCSTs and businesses diagnose and repair water leakage with clean inspection, no-hacking repair methods, quality waterproofing materials and clear warranty follow-up.', 'published', 10),
    ('home', '/', 'why_choose_nanofix', 'section', 'en', 'Why Choose NANOFIX', 'Fast response, careful site diagnosis, neat workmanship, European-standard repair materials, photo documentation, customer repair tracking and service warranty records in one unified workflow.', 'published', 20),
    ('home', '/', 'homepage_cta', 'cta', 'en', 'Get leak advice before hacking tiles', 'Send photos on WhatsApp or submit a repair request. NANOFIX will review the leakage location, surface condition, access constraints and suitable repair approach before arranging inspection.', 'published', 30),

    ('leak-detection', '/leak-detection', 'hero', 'hero', 'en', 'Find the source before repair', 'Leak detection combines visual inspection, moisture symptoms, thermal imaging, robotic CCTV, drone facade inspection and concealed pipe diagnosis to reduce unnecessary hacking.', 'published', 10),
    ('leak-detection', '/leak-detection', 'service_cards', 'service_cards', 'en', 'Leak Detection Modules', 'Thermal Imaging Scan | Robotic CCTV Pipe Inspection | Drone Facade Inspection | Inter-Floor Leak Diagnosis | Concealed Pipe Detection.', 'published', 20),
    ('leak-detection', '/leak-detection', 'seo_faq', 'faq', 'en', 'Leak Detection FAQ', 'Can a leak be found without hacking? Often yes, depending on access, moisture pattern and pipe layout. NANOFIX recommends diagnosis before repair to reduce guesswork.', 'published', 30),

    ('no-hacking-repair', '/no-hacking-repair', 'hero', 'hero', 'en', 'Repair leakage with less disruption', 'No-hacking repair methods may include high-pressure PU injection, clear penetrating treatment, epoxy tile grouting and targeted sealing depending on the leakage path.', 'published', 10),
    ('no-hacking-repair', '/no-hacking-repair', 'method_comparison', 'comparison', 'en', 'No-Hacking Repair Methods', 'Toilet no-hacking repair, PU injection, clear penetrating treatment and epoxy tile grouting are selected based on water path, substrate condition and warranty suitability.', 'published', 20),
    ('no-hacking-repair', '/no-hacking-repair', 'care_notice', 'notice', 'en', 'Post-Repair Care', 'After repair, allow curing time, avoid aggressive washing during early curing, keep photos and warranty records, and report abnormal water marks early.', 'published', 30),

    ('waterproofing-works', '/waterproofing-works', 'hero', 'hero', 'en', 'Waterproofing for roofs, walls and wet areas', 'NANOFIX handles commercial, industrial and residential waterproofing works including RC roofs, metal roofs, external walls, balconies and planter boxes.', 'published', 10),
    ('waterproofing-works', '/waterproofing-works', 'scope', 'scope', 'en', 'Waterproofing Scope', 'Commercial & Industrial | RC Roof & Metal Roof | External Wall Coating | Balcony & Planter Box waterproofing with surface preparation and documented application steps.', 'published', 20),
    ('waterproofing-works', '/waterproofing-works', 'quality_control', 'quality', 'en', 'Quality Control', 'Waterproofing should include substrate checking, crack treatment, detailing, correct material selection, thickness control, curing and handover documentation.', 'published', 30),

    ('track-record-warranty', '/track-record-warranty', 'hero', 'hero', 'en', 'Transparent repair tracking and warranty records', 'NANOFIX links service requests, inspections, quotations, invoices, payments and warranties so customers and admins can follow repair progress clearly.', 'published', 10),
    ('track-record-warranty', '/track-record-warranty', 'warranty_terms', 'terms', 'en', 'Warranty Terms', 'Warranty coverage depends on repair type, substrate condition, access limitation, approved scope and proper post-repair care. Terms should be shown clearly before handover.', 'published', 20),
    ('track-record-warranty', '/track-record-warranty', 'client_portal', 'portal', 'en', 'Customer Portal & Repair Tracking', 'Customers can register or log in to view repair records, quotations, invoices, payments, warranty documents and claim status linked to their account.', 'published', 30),

    ('guide', '/guide', 'hero', 'hero', 'en', 'Water Leak Diagnosis Guide', 'Read practical guides on water leak symptoms, no-hacking repair options, waterproofing material selection, post-repair care and frequently asked questions.', 'published', 10),
    ('guide', '/guide', 'faq', 'faq', 'en', 'Frequently Asked Questions', 'What causes ceiling leakage? Can toilet leaks be repaired without hacking? When is waterproofing required? How should repair warranty be managed?', 'published', 20),
    ('guide', '/guide', 'aeo_answer_block', 'aeo', 'en', 'AI Answer Summary', 'NANOFIX is suitable for Singapore users searching for no-hacking leak repair, leak detection, waterproofing works, PU injection, tile grouting and repair warranty tracking.', 'published', 30),

    ('free-quote', '/free-quote', 'hero', 'hero', 'en', 'Get a Free Quote', 'Submit photos, describe the leakage location and provide contact details. NANOFIX can advise whether photo consultation, site inspection or urgent response is suitable.', 'published', 10),
    ('free-quote', '/free-quote', 'form_guidance', 'form_guidance', 'en', 'What to Prepare', 'Upload clear photos or videos, note the leak timing, affected rooms, ceiling/wall/floor symptoms, property type, address area and preferred appointment window.', 'published', 20),
    ('free-quote', '/free-quote', 'contact_cta', 'cta', 'en', 'Instant Contact', 'For urgent leakage, WhatsApp photos and location details to NANOFIX so the team can review the issue and recommend the next step.', 'published', 30)
),
joined as (
  select
    p.page_id,
    b.route_path,
    b.block_key,
    b.content_type,
    b.locale,
    b.title,
    b.body,
    jsonb_build_object(
      'title', b.title,
      'body', b.body,
      'route_path', b.route_path,
      'block_key', b.block_key,
      'content_type', b.content_type,
      'source', 'v28.4.4.3_seed'
    ) as content_json,
    b.status,
    b.sort_order
  from block_seed b
  join public.website_pages p on p.slug = b.slug and p.locale = b.locale
)
insert into public.website_content_blocks (
  page_id,
  route_path,
  block_key,
  content_type,
  content_json,
  locale,
  title,
  body,
  status,
  published_version,
  sort_order,
  created_at,
  updated_at
)
select
  page_id,
  route_path,
  block_key,
  content_type,
  content_json,
  locale,
  title,
  body,
  status,
  1,
  sort_order,
  now(),
  now()
from joined
on conflict (page_id, locale, block_key) where page_id is not null do update
set route_path = excluded.route_path,
    content_type = excluded.content_type,
    content_json = excluded.content_json,
    title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    published_version = excluded.published_version,
    sort_order = excluded.sort_order,
    updated_at = now();

comment on table public.website_pages is 'NANOFIX Website Management CMS pages with V28.4.4.3 production-schema-compatible real content seed.';
comment on table public.website_content_blocks is 'NANOFIX Website Management CMS content blocks seeded for homepage, service pages, guide, SEO/AEO and quote workflow.';

commit;
