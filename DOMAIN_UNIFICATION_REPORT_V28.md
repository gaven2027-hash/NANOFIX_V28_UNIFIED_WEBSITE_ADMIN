# NANOFIX V28 Domain Unification Report

## Target website domain

All NANOFIX public website domain references were standardized to:

```text
https://www.nanofixsg.com
www.nanofixsg.com
```

## Updated areas

- `NEXT_PUBLIC_SITE_URL` default and `.env.example`
- Next.js `metadataBase`
- SEO route base URL in `lib/nanofix/seo.ts`
- `robots.ts` sitemap URL generation
- `sitemap.ts` route URL generation through the shared base URL
- LocalBusiness schema `@id`, `url`, `image`, and `logo`
- Preview package canonical URLs
- Preview package route-specific canonical URLs
- Website visible domain text
- Footer website link
- Customer portal links changed to `https://www.nanofixsg.com/member-sign-up-login`
- CMS Admin links changed to `https://www.nanofixsg.com/admin`
- Preview generation script `tools/build-preview-package.mjs` updated so future preview builds keep the same domain

## Verification performed

```text
npm run typecheck: passed
npm run lint: passed
npm run build:css: passed
npm run build:preview: passed
Domain grep check: no legacy NANOFIX-owned website domain variants found
Preview canonical examples:
- https://www.nanofixsg.com/
- https://www.nanofixsg.com/leak-detection/thermal-imaging-scan
- https://www.nanofixsg.com/member-sign-up-login
```

Note: `next build` compiled and generated static pages successfully in this container, but the command was stopped by the tool timeout during the final trace/packaging stage. The domain change itself is source/static-output based and typecheck/lint/preview generation passed.
