# V28.5.1 Live Core Final Clean Scope

This branch is based on the post-merge V28.5 main commit `2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82`.

Scope:
- Align `app/api/admin/service-operations/route.ts` with production schema fields for quotations, invoices, payments, and warranties.
- Add `tools/verify-v28-5-1-live-core-schema-alignment.mjs` as a standalone verifier.

Intentionally not included:
- No Supabase production migration apply.
- No production database reset or repair.
- No direct `writeStatusTransitionLog()` change in Live Core.
- No retarget or merge of old PR #20 / temporary PR #21.
- No package.json script update in this connector-run branch; run the verifier directly with `node tools/verify-v28-5-1-live-core-schema-alignment.mjs`.
