# NANOFIX V28.9 Auto Global Repair Gate

This gate keeps V28.9 Step 1 as a scanner-only branch until validation succeeds.

## Must pass before merge

- `node tools/v28-9-auto-global-repair.mjs`
- `node tools/verify-v28-9-auto-global-repair.mjs`
- Vercel Preview Ready
- production `/api/ready` after merge

## Must not happen

- direct `main` modification
- production Supabase reset
- RLS disable
- verifier bypass
- build / smoke bypass
- direct AI publish
- direct social publish
- paid ad activation
