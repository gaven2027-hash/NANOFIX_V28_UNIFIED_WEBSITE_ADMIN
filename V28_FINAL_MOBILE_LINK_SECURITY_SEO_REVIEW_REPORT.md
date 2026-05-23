# NANOFIX Website V28 Final Mobile, Link, Security and SEO Review

## Version naming
- All package-level and repository file names now use V28 only.
- Sub-version naming has been removed from file names, package version text, scripts and review reports.
- Legacy historical sub-version file names were renamed to V28-only names or removed when obsolete.

## Mobile visual and layout fixes
- Added V28 mobile visual lock CSS to protect narrow-screen layouts without changing the approved desktop visuals.
- Protected mobile hero, carousel cards, service cards, forms, Google Map iframe, media elements, dropdowns and sidebars from horizontal overflow.
- Forced quote forms to collapse to one column on small screens.
- Added max-width safeguards for images, videos, iframes, canvases, SVGs and form controls.
- Preserved the approved homepage layout, CTA, carousel, cards, colours and navigation structure.

## Link and route checks
- Anchor checks passed for main, English and Chinese legacy bodies.
- Production route checks passed for root, service pages, quote page, English/Chinese routes, API health, robots and sitemap.
- Admin route correctly returns 401 without authentication.

## Security checks
- Security headers are present in next.config.mjs: HSTS, CSP, X-Content-Type-Options and X-Frame-Options.
- Admin middleware uses Supabase admin verification with controlled token fallback.
- robots.txt blocks /admin/ and /api/ from indexing.
- npm audit completed with 0 moderate-or-higher vulnerabilities.
- Note: CSP still keeps unsafe-inline because the current visual-lock version intentionally renders legacy HTML/CSS/JS. A pure React component rebuild should remove this later.

## SEO / AEO checks
- Sitemap includes root, /en, /zh and default/en/zh SEO route coverage.
- robots.txt references the canonical sitemap at https://www.nanofixsg.com/sitemap.xml.
- Route metadata remains locale-aware.
- LocalBusiness, Service, FAQ and Breadcrumb structured data support the website route system.

## Deployment compatibility
- Next.js App Router project structure is preserved.
- Build, verification and production start checks passed.
- Compatible with GitHub upload, Vercel deployment and Supabase environment variable configuration.

## Verification results
- npm run build: passed
- npm run verify: passed
- npm audit --audit-level=moderate: 0 vulnerabilities
- V28 audit: passed
- V28 anchor verification: passed
