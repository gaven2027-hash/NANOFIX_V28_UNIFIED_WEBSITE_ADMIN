# NANOFIX V28.8 Phase 10 — Backup & Recovery Real Module Baseline

Date: 2026-06-12
Branch: `v28-8-phase-10-backup-recovery`
Base: post V28.8 Phase 9 merge commit `14247356589058f60112d97e7d1f503d866ddcd9`

## Goal

Phase 10 continues the real business-module hardening sequence after Website Publish Approval. Backup & Recovery / 备份与恢复 is the production safety layer for database continuity, encrypted exports, audited download links, restore dry runs and release-gate readiness.

中文目标：在网站发布审核基线完成后，锁定备份与恢复真实链路，确保系统可以从总后台查看备份任务、创建加密备份、生成审计下载链接、执行恢复演练，并且严禁生产库重置、严禁关闭 RLS、严禁未经审批直接恢复生产数据。

## Why Backup & Recovery after Website Publish Approval

The expected continuity chain is:

1. Production module health / 生产模块健康
2. Backup job queue / 备份任务排队
3. Encrypted backup execution / 加密备份执行
4. Encrypted storage object / 加密备份文件
5. Redaction manifest / 脱敏清单
6. Audited download link / 审计下载链接
7. Restore dry run / 恢复演练
8. Approval before real restore / 真实恢复前审批
9. Production readiness gate / 生产发布健康门禁

If backup/recovery is weak, later repair phases may produce irreversible production risk.

## Locked Backup & Recovery chain

### 1. System Settings mounting baseline

The System Settings page must continue to:

- mount `BackupCenter`;
- keep it inside `AdminShell`;
- describe backup as part of Website & System Settings;
- keep RBAC, workflow settings, diagnostics and customer review links separate from backup actions.

### 2. Backup Center UI baseline

The Backup Center UI must continue to:

- call `/api/admin/backups/jobs` using same-origin session bearer headers;
- load backup jobs with `cache: no-store`;
- support module options:
  - `central_database`;
  - `customers`;
  - `service_requests`;
  - `website`;
  - `ai`;
  - `social`;
  - `audit_logs`;
- support Queue Backup Job;
- support Run Encrypted Backup Now;
- support Restore Dry Run by backup ID;
- support audited signed download link generation only for completed backup jobs;
- display encrypted file path and signed URL expiry;
- avoid browser localStorage/sessionStorage workflow state.

### 3. Backup Jobs API role boundary

The backup jobs API must continue to:

- use `requireAdmin`;
- require `read:*` for GET;
- require `write:settings` for POST;
- reject requests without Supabase admin client;
- validate input using schema;
- support only controlled modes:
  - `queue`;
  - `run_now`;
  - `restore_dry_run`;
  - `create_signed_url`.

### 4. Encrypted backup baseline

Encrypted backup execution must continue to:

- use `NANOFIX_BACKUP_ENCRYPTION_KEY` or `BACKUP_ENCRYPTION_KEY`;
- encrypt JSON payload with AES-256-GCM;
- write the `NANOFIX-BACKUP-V1` backup header;
- upload encrypted objects to a private Supabase storage bucket;
- use no-store cache control;
- mark `backup_jobs.status` as running, completed or failed;
- return `download_requires_approval: true`;
- not return a signed URL automatically after backup execution.

### 5. Redaction manifest baseline

Backup export must continue to:

- select only preferred export columns;
- exclude sensitive columns matching password, secret, token, api key, service role, private key, credential, session, OTP, hash or salt patterns;
- redact nested sensitive values;
- include a redaction manifest with exported columns and redacted column pattern;
- limit exported rows per table.

### 6. Audited download baseline

Signed download link creation must continue to:

- require `backup_id`;
- only allow completed backup jobs;
- create a short-lived signed URL;
- update `signed_url_expires_at`;
- redact the signed URL in audit metadata;
- write `backup.signed_download_link_created` audit log.

### 7. Restore dry run safety baseline

Restore dry run must continue to:

- require `backup_id`;
- download the encrypted object from storage;
- validate the `NANOFIX-BACKUP-V1` header;
- return dry-run status only;
- write `backup.restore_dry_run` audit log;
- explicitly not overwrite production data.

### 8. Production restore prohibition baseline

Phase 10 does not implement direct production restore.

Real production restore remains prohibited unless all conditions are met:

- super admin approval;
- maintenance window;
- staging restore rehearsal completed;
- latest production backup verified;
- customer-facing modules paused if needed;
- RLS remains enabled;
- no production Supabase reset;
- audited restore plan and rollback plan exist.

### 9. Production readiness baseline

The production `/api/ready` endpoint must continue checking:

Core operational tables:

- `audit_logs`
- `workflow_settings`
- `service_requests`
- `jobs`
- `customers`

Backup support tables:

- `backup_jobs`
- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `app_modules`

## Phase 10 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-10-backup-recovery.mjs
```

## Completion criteria

Phase 10 Backup & Recovery baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge;
- no production restore/reset/RLS-disable action has been introduced.

## Next module after this phase

After Backup & Recovery is locked, continue with:

1. AI / Social / Advertising production-safe content loop
2. System Health & Release Gate hardening
3. Final V28.8 release gate checklist
4. Production smoke-test checklist
