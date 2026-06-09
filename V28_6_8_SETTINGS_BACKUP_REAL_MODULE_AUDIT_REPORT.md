# V28.6.8 Settings / Backup Real Module Audit Report

Generated: 2026-06-09T09:38:49.730Z

OK: true

## Summary

- Required files checked: 6
- Optional legacy files checked: 1
- Findings total: 4
- P0 findings: 0
- P1 findings: 4

## Findings

- **P1 / data_safety** app/api/admin/backups/jobs/route.ts: Backup data collector exports whole selected table rows without explicit redaction allowlist. Keep encrypted, but add a future redaction manifest before target 94-96.
- **P1 / download_control** app/api/admin/backups/jobs/route.ts: Run-now response returns a signed URL directly. Acceptable for Super Admin workflow, but future target should require approval/download audit step.
- **P1 / legacy_route** app/api/admin/backup-schedules/route.ts: Legacy backup schedule route uses wildcard permission for POST. Prefer canonical /api/admin/backups/schedules with write:settings.
- **P1 / legacy_route** app/api/admin/backup/route.ts: Legacy backup API appears to use older backup_jobs columns/RPC. Keep disabled from UI or retire/redirect to /api/admin/backups/jobs.

## Live Checks To Attach

- backup_jobs and backup_schedules RLS/policy status
- system-backups storage bucket privacy
- production env readiness for NANOFIX_BACKUP_ENCRYPTION_KEY

## Recommendation

No blocking P0. Create V28.6.8.1 focused hardening for legacy route cleanup, redaction manifest, and download approval before target 94-96.
