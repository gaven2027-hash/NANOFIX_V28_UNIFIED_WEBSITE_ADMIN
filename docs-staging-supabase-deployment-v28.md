# NANOFIX V28 Staging → Production Deployment Gate

This package is designed for a separate Supabase staging project before production deployment.

## Required order
1. Create a dedicated Supabase staging project.
2. Copy `.env.staging.example` to `.env.staging` and fill staging-only keys.
3. Run all Supabase migrations against staging.
4. Run `supabase/seed_v28_staging.sql` against staging.
5. Run `npm run check:staging`.
6. Run `npm run typecheck`, `npm run lint`, `npm run verify:ci`, and `npm run build`.
7. Deploy the staging branch to Vercel Preview.
8. Run Playwright E2E against the Vercel Preview URL.
9. Only after staging passes, promote the same Git commit to production.

## Production rule
Never reuse the production Supabase database for staging tests. Staging must have its own project ref, anon key, service role key, storage bucket, and backup encryption key.
