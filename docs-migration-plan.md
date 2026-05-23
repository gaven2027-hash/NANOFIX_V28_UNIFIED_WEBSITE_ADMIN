# NANOFIX Next.js / AEO / SEO / Backend Migration Plan

## Current Package Analysis

- Source package contains two HTML previews and 31 image assets.
- Current site is a single-page anchor-routing website with these visible sections: Home, Leak Detection, No-Hacking Repair, Waterproofing Works, Track Record & Warranty, Guide, Free Inspection & Quote, Contact/Footer.
- Existing SEO foundations already include title, description, canonical URL, keywords, Open Graph, LocalBusiness schema and FAQ schema.
- Existing front-end behavior includes language switching, hash-based page visibility, carousel scrolling, active nav state, OneMap postal lookup, WhatsApp CTA and lead-form success messaging.

## Recommended Migration Strategy

1. Phase 1: Exact visual preservation.
   Keep the original HTML/CSS/JS as the visible rendering baseline inside Next.js. This is the safest way to guarantee that layout, columns, cards, section order, anchors, text, images and front-end behavior do not change.

2. Phase 2: Controlled component refactor.
   After visual approval, gradually split stable areas into React components: Header, Footer, HomeHero, ServicePage, GuidePage, QuotePage, FAQ, Testimonials and ContactMap. Each refactor must be screenshot-compared before release.

3. Phase 3: CMS/admin integration.
   Move editable content into Supabase tables or the master admin backend, but keep the same front-end field names and display schema so the published site remains visually unchanged.

## AEO / SEO Requirements

- Keep server-rendered text, headings and internal anchor links crawlable.
- Add Next.js metadata, canonical, Open Graph and sitemap/robots routes.
- Extend structured data: LocalBusiness, Service, FAQPage, BreadcrumbList, WebSite SearchAction and Review snippets if real review data is available.
- Build separate indexable URLs later for each major section: `/leak-detection`, `/no-hacking-repair`, `/waterproofing-works`, `/guide`, `/quote`. Keep hash anchors as redirects or compatibility links.
- Use real Singapore service-area wording and question-style headings for AEO answers.
- Compress oversized images and add width/height/alt text during the Phase 2 component refactor.

## Security Recommendations

- Server-only Supabase service role key; never expose it to the browser.
- Use `/api/public-repair-request` for public repair / quote submission and keep `/api/leads` as a compatibility alias.
- Add security headers: CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options and Permissions-Policy.
- Validate all form fields with Zod.
- Add rate limiting before public launch, ideally Vercel KV/Upstash or Supabase edge rate limits.
- Move third-party scripts to explicit allowlists and review CSP before production.

## Backend/Admin Connection

- Website lead form posts to `/api/public-repair-request`; `/api/leads` forwards to the same handler for compatibility.
- API writes to Supabase `unified_intake` and `leads`.
- API optionally forwards the same record to `ADMIN_REPAIR_REQUEST_URL` with `ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET`.
- Website top CTA remains `⭐️ Get a Free Quote`; backend business semantic is `Free Leak Inspection & Quote`.
- `Member Sign Up / Login` is a separate customer account entrance configured by `NEXT_PUBLIC_MEMBER_PORTAL_URL`; it must not be mixed with the no-login repair request flow.
- Master admin can manage service cards, FAQ, guide articles, project records, testimonials, warranty terms and homepage ranking policy.
- Recommended admin workflow: draft -> preview -> publish -> invalidate Vercel cache.

## GitHub / Supabase / Vercel Deployment

1. Push `outputs/nanofix-nextjs` as the app root to GitHub.
2. Create Supabase project and run the SQL from `README.md`.
3. Add Vercel environment variables from `.env.example`.
4. Import GitHub repository into Vercel.
5. Build command: `npm run build`. Run `npm run prepare:legacy` only when the source preview HTML changes.
6. Output: Next.js default.
7. Add custom domain `www.nanofixsg.com`.

## What Can Change Without Affecting Visible UI

- Next.js route/app structure.
- API routes and Supabase integration.
- Security headers and server validation.
- Image optimization pipeline, as long as rendered dimensions and cropping remain identical.
- Schema, sitemap, robots and metadata.
- Admin data model and webhook sync.
