# V28.5.1 Live Core Clean Scope

This clean branch is based on main after V28.5 PR #19 merge commit `2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82`.

Scope:
- Align `app/api/admin/service-operations/route.ts` with production schema for quotation, invoice, payment and warranty.
- Add `tools/verify-v28-5-1-live-core-schema-alignment.mjs` to guard against legacy schema markers.

Explicitly not included:
- No Supabase production migration apply.
- No RLS disable/reset/repair.
- No direct `writeStatusTransitionLog()` reintroduction.
- No production tag overwrite.
- The package script could not be safely restacked via connector full-file update; verifier can be run directly with:

```bash
node tools/verify-v28-5-1-live-core-schema-alignment.mjs
```
