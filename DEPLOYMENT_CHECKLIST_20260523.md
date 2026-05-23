# NANOFIX V28 Deployment Checklist

1. Push package to GitHub.
2. Configure Vercel project root as this package root.
3. Add Vercel env variables from `.env.example`.
4. In Supabase, apply all migrations in `supabase/migrations` in timestamp order.
5. Confirm `/api/ready` returns `ok: true` after DB tables exist.
6. Test public form: submit a repair request and confirm records in `unified_intake`, `leads`, `service_requests`, `audit_logs`.
7. Test admin login using Supabase Auth user with active `profiles.role`.
8. Test Customer Portal with a customer role profile and RLS-bound records.
9. Test Engineer Portal with an engineer role profile and assigned job records.
10. Test module health: `/api/health/dashboard`, `/api/health/service-operations`, `/api/health/customer-center`, `/api/health/ai-center`.
11. Test webhook idempotency/replay with payment and social webhook secrets.
12. Keep admin token fallback disabled unless a controlled maintenance window requires it.
