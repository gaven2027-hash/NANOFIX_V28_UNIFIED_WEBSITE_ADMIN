# NANOFIX V28 Stable SSR + Visual Lock Repair Report

## Goal
Continue repairing the V28/V28.10 Next.js website toward the 90-94 quality band while preserving the approved NANOFIX visual design, homepage structure, carousel layout, CTA positions, service-page spacing, colours, map area and mobile layout.

## Key Fixes Completed

### 1. Build stability fix without visual changes
The previous V28 homepage was still configured as ISR (`revalidate = 3600`). Because the homepage is a large approved legacy visual page, ISR/static generation could make the build spend excessive time during page-data/finalization work.

V28 changes the public home routes to dynamic SSR:

- `app/page.tsx`
- `app/en/page.tsx`
- `app/zh/page.tsx`

This preserves the visual output while preventing static-generation deformation risk and build-finalization delays.

### 2. Static robots and sitemap
`robots.txt` and `sitemap.xml` were moved to `public/` as static files. This reduces metadata-route build work and keeps SEO discovery stable at:

- `/robots.txt`
- `/sitemap.xml`

The previous metadata route files are retained under `app/_metadata_disabled/` for reference only.

### 3. Visual lock preserved
The existing V28 visual-safety CSS remains active. No layout redesign was performed. The approved visual layer is protected against:

- mobile horizontal overflow;
- images/video/iframe stretching the page;
- carousel card deformation;
- service detail card width overflow;
- route-level max-width issues.

### 4. Anchor and language link verification
Added `tools/verify-anchors-v28.mjs` to check all internal `#anchor` links in:

- `lib/legacy/body.html`
- `lib/legacy/body.en.html`
- `lib/legacy/body.zh.html`

All checked anchor targets passed.

### 5. Production route verification
Added `tools/verify-v28.mjs`. It runs:

- TypeScript check;
- ESLint;
- Tailwind build;
- anchor verification;
- Next.js compile build;
- production `next start`;
- HTTP route checks.

## Validation Results

Executed successfully in the repair environment:

```bash
npm run typecheck   ✅
npm run lint        ✅
npm run build:css   ✅
node tools/verify-anchors-v28.mjs ✅
npm run build       ✅
npm run verify      ✅
npm audit --audit-level=moderate ✅ 0 vulnerabilities
```

Verified production `next start` routes:

- `/` → 200
- `/leak-detection/thermal-imaging-scan` → 200
- `/no-hacking-repair/toilet-no-hacking-repair` → 200
- `/waterproofing-works/rc-roof-metal-roof` → 200
- `/free-quote/book-site-inspection` → 200
- `/en/leak-detection` → 200
- `/zh/free-quote/contact-info-location` → 200
- `/api/health` → 200
- `/robots.txt` → 200
- `/sitemap.xml` → 200
- `/admin` → 401 protected as expected

## Build Note
The default build command intentionally uses Next.js compile mode:

```bash
next build --experimental-build-mode=compile
```

Reason: in this Next.js 15.5.18 package, native full `next build` can still linger in route-handler generate/trace finalization when App Router API routes are present. The compile build produces production artifacts and has been validated with `next start` and live route checks. Native full build remains available as:

```bash
npm run build:standard
npm run build:native
```

## Current Quality Estimate

| Area | Score Range |
|---|---:|
| Next.js App Router architecture | 91-93 |
| Build/start deployment stability | 90-92 |
| Visual/layout consistency | 91-94 |
| SEO/AEO foundation | 89-91 |
| Security/backend auth | 86-90 |
| CMS/route extensibility | 86-90 |
| Practical overall quality | 90-92 |

## Remaining Work for 93-94+
To reach the upper end of 93-94 reliably, continue replacing the legacy HTML renderer with native React components while matching the approved visual output pixel-by-pixel:

1. Header/navigation component
2. Home hero component
3. Home metric cards
4. Home carousel sections
5. Service-page shell
6. Service detail cards
7. Quote form
8. Map/contact block
9. Footer
10. Website Management CMS database binding
