# NANOFIX V28.16 System Modules Chinese Encoding & Module Registry Verification

## Scope

V28.16 verifies whether `/api/system/modules` returns correct UTF-8 Chinese module names or whether the earlier mojibake display was caused by PowerShell output encoding.

No business API logic, Supabase schema, RLS policy, public website visual layout, or admin workflow behavior was changed.

## Production Endpoint Checked

- Endpoint: `https://app.nanofixsg.com/api/system/modules`
- Method: GET
- Result: 200
- Total modules: 11

## UTF-8 Verification Method

The endpoint response was downloaded as raw bytes using `curl.exe`, then read back with UTF-8 encoding in PowerShell.

The parsed JSON confirmed that `nameZh` values are valid Chinese strings.

## Verified Module Chinese Names

| key | name | nameZh |
|---|---|---|
| public-website | Public Website | 官网前台 |
| central-admin | Central Admin Backend | 总管理后台 |
| service-operations | Service & Order Operations | 业务订单运营 |
| customer-center | Customer Center & Portal | 客户中心与会员门户 |
| website-management | Website Management | 网站后台管理 |
| social-media | Social Media Management | 社媒管理中心 |
| ai-center | AI Intelligence Center | AI 智能中心 |
| backup-download | Backup & Download Center | 备份与下载中心 |
| integration-bus | Integration Bus & Outbox | 集成事件总线与重试队列 |
| data-core | Supabase Central Data Core | Supabase 统一数据中心 |
| rbac-audit | RBAC, RLS & Audit Layer | 权限、RLS 与审计层 |

## Finding

The production API response is correctly encoded as UTF-8.

The earlier mojibake display such as `å®ç½...` was caused by PowerShell response display / decoding behavior, not by an API or data-source defect.

## Final Status

V28.16 baseline status: Passed.

No production code fix is required.