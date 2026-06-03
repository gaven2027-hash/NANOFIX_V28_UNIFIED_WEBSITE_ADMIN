# NANOFIX V28.3 Fast Reality Audit Fix Memory / 修复经验记忆

Date: 2026-06-03
Repo: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
Baseline: V28.3 after local build success and production app domain live.

## Final Result / 最终结果

`npm run audit:fast-reality` and `npm run audit:fast-reality:risks` reached:

```text
Public read allowlisted APIs: 6
Public write audited allowlisted APIs: 9
P0 findings: 0
API routes with risks: 0
No P0 static findings.
No P0 static files.
```

The API risk count was reduced from 41 to 0. Static P0 findings were reduced from 4 to 0.

## Key Fixing Strategy / 核心修复策略

The successful strategy was not manual one-by-one button checking. It was:

1. Build an automated fast reality audit script.
2. Separate real risks from false positives.
3. Add explicit public allowlists only for safe public read/write endpoints.
4. Require authentication for admin write endpoints.
5. Add Audit Logs to write endpoints.
6. Recognize transaction RPCs where the database transaction itself writes audit logs.
7. Re-run the audit after every batch until risk count reached zero.

## Public Endpoint Rules / 公开入口规则

Public endpoints must not automatically be treated as insecure. They are valid only if they are designed to be public and either read-only low-sensitive endpoints or audited public-write intake endpoints.

### Public read allowlist

Only low-sensitive public read endpoints were allowlisted:

```text
/api/health
/api/health/[module]
/api/ready
/api/system/health
/api/system/modules
/api/cms/blocks
```

These must not return secrets, full database records, RLS-sensitive information, or admin-only details.

### Public write audited allowlist

Public write endpoints are allowed only when they are intentionally public and write an audit trail or call a shared audited intake handler:

```text
/api/leads
/api/service-requests
/api/public-repair-request
/api/public/repair-request
/api/public/repair-requests
/api/public/service-requests
/api/public/registration-requests
/api/customer/register
/api/customer-portal/claim-existing-account
```

These endpoints must not require admin login because they are customer self-service or public repair-intake flows. They must sanitize payloads and write audit-safe summaries instead of storing full sensitive payloads in audit logs.

## Admin Endpoint Rules / 后台接口规则

Admin write endpoints must have:

```text
requireAdminApi / requireActorApi / requireAdmin / requirePermission
```

and one of:

```text
writeAuditLog()
auditLog()
Supabase audit_logs insert
transaction RPC that writes audit logs
```

Credential-binding endpoints such as Ads and Social account connectors must never store plaintext secrets in audit logs. Audit logs should only contain masked or boolean summaries:

```text
account_name_present
external_account_id_present
event_saved
event_skipped
bridge_ready
platform
action
```

## Transaction RPC Rule / 事务 RPC 规则

Some routes are safe because they call transactional Supabase RPCs that write audit logs inside the database transaction. The fast audit script was updated to recognize these:

```text
create_ai_draft_tx
create_backup_job_tx
transition_status_tx
create_job_from_service_request_tx
create_payment_reconcile_tx
create_entity_event_tx
record_payment_and_reconcile
reconcile_payment_webhook_tx
ingest_social_message_tx
record_module_health_snapshot
```

Future transaction RPCs should follow the same convention:

- Name ends with `_tx` when possible.
- Accept actor id / actor role / source IP where relevant.
- Write business mutation and audit log inside the same database transaction.
- Avoid duplicate API-layer audit logs unless useful for request-level metadata.

## Webhook and Worker Rules / Webhook 与 Worker 规则

Webhook routes should not use normal admin login. They must use one of:

```text
requireWebhookSecret
stripe-signature
x-hub-signature
x-signature
WEBHOOK_SECRET
crypto.createHmac
timingSafeEqual
```

Worker routes should not use normal admin login. They must use one of:

```text
CRON_SECRET
NANOFIX_SYSTEM_WORKER_TOKEN
x-system-worker-token
```

Worker/webhook database writes should call audited transaction RPCs when possible.

## Static P0 False Positive Rule / 静态 P0 误报规则

The phrase `fake success` is only a real issue when it describes or implements fake success behavior.

Negative guardrail text must not be treated as a P0 risk:

```text
without fake success
no local fake success
instead of fake success
not create client-side fake success
不显示假成功
不能前端假成功
```

## Important Files Added / 新增重要文件

```text
tools/v28-fast-reality-audit.mjs
tools/v28-print-fast-reality-risks.mjs
reports/v28-fast-reality-audit.json
reports/v28-fast-reality-audit.md
```

## Important Commit Themes / 重要提交主题

- Fast audit script added.
- Public endpoint false positives reduced.
- Fake success rule narrowed.
- Public repair intake audited and allowlisted.
- Portal repair tracking secured.
- Public registration requests audited.
- Customer self-service APIs allowlisted.
- Legacy RBAC requirePermission recognized.
- Audited transaction RPCs recognized.
- Worker/webhook audited RPCs recognized.
- Ads and Social connector routes secured with admin auth and audit logs.
- Admin entity events API audit log added.

## Future Repair Guidance / 未来修复参考

For future NANOFIX V28 repairs:

1. Do not manually inspect every UI button first.
2. Create an audit script that identifies whole categories of risk.
3. Classify endpoints into admin, customer portal, public intake, webhook, worker, transaction RPC.
4. Fix by category, not by isolated file.
5. Re-run audit after each batch.
6. Save the final rules into docs so the next phase does not repeat the same false positives.

This memory is now the reference basis for Phase B: Admin 0–8 Reality Deep Audit.
