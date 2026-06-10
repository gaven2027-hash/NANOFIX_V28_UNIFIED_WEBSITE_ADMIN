# V28.6.9.2 RLS Static Evidence / Live Policy Verifier Report

Generated: 2026-06-10T02:55:56.829Z

OK: true

## Summary

- P0: 0
- P1: 0
- P2: 0
- Tables checked: 4

## Tables

- unified_intake
- leads
- quotation_versions
- audit_logs

## Production Live Evidence Required

- All four tables have relrowsecurity = true.
- All four policies exist with production-aligned role matrices.
- validate:predeploy should remove previous RLS evidence warnings for these four tables.
- /api/ready and /api/system/health stay ok:true after controlled migration apply.

## Findings

- No findings.
