# NANOFIX V28.8 Phase 1 — Production Stability & RBAC Baseline

Date: 2026-06-11
Branch: `v28-8-production-rbac-real-module-hardening`
Base: post V28.7 production merge commit `2f1ff506b324d2b7d295a695c9955ead30c66fa1`

## Goal

Phase 1 does not introduce a new business feature. It locks the production baseline after V28.7 so the next repair cycles can safely deepen real modules without breaking authentication, roles, database readiness, or portal boundaries.

中文目标：第一阶段不做新业务页面，先锁定 V28.7 上线后的生产稳定性和角色权限基线，确保后续继续维修时不破坏后台角色、客户门户、数据库健康和生产部署安全边界。

## Production health baseline confirmed

The production health check after V28.7 merge confirmed:

- `https://app.nanofixsg.com` responds with `307` to `/login?role=admin`.
- `https://app.nanofixsg.com/api/ready` responds with `200 OK`.
- `https://app.nanofixsg.com/admin` responds with `307` to `/login?role=admin&next=%2Fadmin&reason=auth_required`.
- `https://app.nanofixsg.com/portal/customer` responds with `200 OK`.
- `https://app.nanofixsg.com/portal/engineer` responds with `200 OK` as a compatibility entry.

The detailed `/api/ready` JSON confirmed:

- `ok: true`
- `environment: production`
- `env_ready: true`
- `database_ready: true`
- `optional_database_ready: true`
- `supabase_configured: true`
- `failed_core_tables: []`
- `failed_optional_tables: []`

## Locked role model

The V28.8 baseline preserves the role model confirmed after V28.7:

| Role group | Runtime role | Meaning | Boundary |
|---|---|---|---|
| `super_admin` | `super_admin` | Super Admin / 总管理员 | Full backend authority, takeover/audit required. |
| `admin` | `content_admin` | Admin / 管理员 | Daily internal management, CMS/content/admin workflows. |
| `inspection_repair` | `engineer` | Engineer / Inspection / 工程师/检测/维修 | Internal Admin App only; no standalone engineer login/register system. |
| `operations` | `operations_admin` | Operations / 运营 | Service/order coordination and operational workflows. |
| `finance` | `finance` | Finance / 财务 | Quote, invoice, payment, finance records. |
| `customer` | `customer` | Customer / 客户 | Customer Portal only, customer-owned records only. |

Compatibility aliases remain accepted during review:

- `total_management` → `super_admin`
- `management` → `admin`

## Portal boundary baseline

- Customers use the independent Customer Portal.
- Internal staff use the Internal Admin App.
- Engineer / Inspection / Repair is an internal role group under the Internal Admin App.
- `/portal/engineer` is a compatibility entry only. It must not become a separate public engineer system.
- No standalone engineer register/login route should be reintroduced.

## RBAC baseline

The first-stage verifier must protect these conditions:

1. `lib/nanofix/auth.ts` accepts only middleware-verified server headers.
2. Frontend-provided role headers remain ignored.
3. `super_admin` keeps wildcard `*` permission.
4. `engineer` keeps operational/assigned-job permissions only.
5. `customer` keeps customer portal permissions only.
6. Registration review maps `inspection_repair` to runtime `engineer`.
7. Registration review maps `operations` to runtime `operations_admin`.
8. Registration review maps `finance` to runtime `finance`.
9. `super_admin` approval cannot be silently granted by a non-super-admin actor.
10. Public registration accepts internal role groups but not a standalone engineer role type.

## Production readiness baseline

The first-stage verifier must also protect `/api/ready` shape:

- Required core tables include key customer/service/quote/payment/warranty/workflow/audit tables.
- Optional module tables include automation, notification, internal inbox, content drafts, AI logs, backup jobs, app modules, and customer linkage tables.
- `ok` is based on environment readiness and core database readiness.
- Optional database health is exposed separately and must not hide core failures.

## First-stage command

Run this on the V28.8 branch before making deeper module changes:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

npm.cmd run verify:v28-8-phase-1
```

## Next phase after this baseline

After Phase 1 passes locally and in PR checks, Phase 2 can start deepening real modules in this order:

1. Service Requests / 报修单
2. Jobs / 工单
3. Quotations / 报价
4. Invoices / 发票
5. Payments / 付款
6. Warranties / 保修
7. Customer Reviews / 客户评价
8. Website Publish Approval / 网站发布审核
