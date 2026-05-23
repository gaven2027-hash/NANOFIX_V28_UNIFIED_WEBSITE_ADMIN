# NANOFIX Website V28 Merged Production Report

## Base

V28 uses `GP / V28 Domain Unified` as the production base.

## Merged from GG / V28.6

- Local FontAwesome-compatible icon subset at `public/vendor/nanofix-icons.css`
- English and Chinese legacy HTML snapshots: `body.en.html`, `body.zh.html`
- `/en`, `/zh`, `/en/...`, `/zh/...` route support
- Local Google Map placeholder asset and lazy iframe loading bridge
- Honeypot, form start timestamp and optional Cloudflare Turnstile validation
- Magic-byte upload validation for image, video and PDF attachments
- UUID + SHA-256 based attachment storage names

## Preserved from GP / V28

- Central SEO route definitions and route-level metadata
- Unified `www.nanofixsg.com` domain handling
- Strict lint/typecheck/build scripts
- GitHub Actions CI workflow
- Vercel configuration
- Admin middleware protection
- `/api/health` and `/api/ready`
- Public form rate limiting and production storage readiness guard

## Output

- Code package: `NANOFIX_NextJS_Website_V28_MERGED_PRODUCTION_CODE_PACKAGE`
- Preview package: `NANOFIX_Website_V28_MERGED_PRODUCTION_PREVIEW_PACKAGE`
