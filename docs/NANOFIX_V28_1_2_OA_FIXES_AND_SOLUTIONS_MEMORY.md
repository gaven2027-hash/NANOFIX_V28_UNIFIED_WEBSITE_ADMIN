# NANOFIX V28.1.2 OA Production Readiness 修复问题与解决方案记录

本文档作为 NANOFIX V28.1.2 统一官网 + 总后台 OA 系统上线前修复记录、项目记忆依据和后续继续开发基准。

适用项目：`NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`

适用分支：`v28-1-1-operable-admin-phase-1`

适用阶段：V28.1.2 OA Production Candidate / OA 正式上线候选版

---

## 一、总体修复目标

本轮修复的目标不是单纯修页面，而是按照 OA 系统正式部署上线要求，对 NANOFIX 统一系统做安全、权限、数据库、业务链路、后台操作、Vercel / GitHub / Supabase 部署兼容性和上线门禁的综合加固。

核心目标如下：

1. 官网、后台、客户门户、工程师门户共用 Supabase 中心数据库。
2. 各模块保持隔离，单个模块异常不影响其他模块。
3. 后台从展示型页面升级为可操作型 OA 管理系统。
4. 所有后台 API 必须经过统一权限校验，不信任前端伪造 header。
5. 客户、工程师、管理员权限分层，客户不得进入 Admin 管理后台。
6. 关键业务流程形成 Lead → Service Request → Booking → Inspection → Quotation → Job → Invoice → Payment → Receipt → Warranty 的闭环。
7. 报修、注册、审核、状态流转、付款、保修、社媒绑定、网站 CMS、备份、健康检查均有数据库表、API、RLS、审计和验证脚本支撑。
8. 部署前必须通过 `validate:predeploy`、`build:ci` 和 OA readiness 检查。

---

## 二、已修复的问题与解决方案

### 1. 后台业务模块原来偏展示，缺少真实操作能力

**问题：**
Service & Order Operations、Customer Center、Engineer Portal、Website Management、Social Media Management、System Settings 等模块原先更多是展示型页面，缺少真实 CRUD、筛选、详情、状态更新和数据库闭环。

**解决方案：**
已补强后台可操作模块，增加真实路由、API 和 Supabase 表连接。重点包括：

- `/service-operations/leads`
- `/service-operations/service-requests`
- `/service-operations/bookings`
- `/service-operations/inspections`
- `/service-operations/quotations`
- `/service-operations/jobs`
- `/service-operations/invoices`
- `/service-operations/payments`
- `/service-operations/warranties`

并增加 `ServiceOperationsWorkspace` 等后台组件，使后台从静态预览升级为可管理的 OA 工作台。

---

### 2. 状态流转可能出现状态与日志不一致

**问题：**
如果前端或普通 API 分开更新业务状态和日志，可能出现状态已变更但日志没写入，或日志写入但状态失败的问题。

**解决方案：**
通过 Supabase RPC 事务化状态流转，核心为：

- `transition_status_tx`
- `status_transition_logs`

要求状态变更和日志写入在同一数据库事务中完成，保证工单、报价、付款、保修等 OA 状态变化可追踪、可审计、可回溯。

---

### 3. 后台 API 存在前端 header 伪造风险

**问题：**
如果后台 API 直接信任 `x-admin-role`、`x-nanofix-role` 等前端可伪造 header，会导致客户或非授权用户冒充管理员风险。

**解决方案：**
统一中间件和 RBAC 校验逻辑：

- Middleware 删除不可信 role header。
- 后台 API 使用服务端已验证身份信息。
- 通过 `x-nanofix-auth-verified` 表示经过服务端校验。
- 默认关闭 token fallback。
- 管理后台 API 必须通过管理员角色校验。

后续所有 Admin API 必须继续遵守：不直接信任客户端传来的角色、权限、客户 ID、工程师 ID。

---

### 4. 注册流程缺少审核机制，管理员/工程师可能自动激活

**问题：**
OA 系统中，客户可以自动注册，但管理员和工程师账号不能直接自动获得后台权限。原流程需要区分客户注册、工程师申请、管理员审核。

**解决方案：**
新增注册审核闭环：

- `portal_registration_requests` 表
- `POST /api/public/registration-requests`
- `GET / PATCH /api/admin/registration-requests`
- `/customer-center/registration-review`
- `RegistrationReviewWorkspace`

规则：

- 客户注册成功只进入 Customer Portal。
- 工程师 / 管理员账号申请必须后台审核。
- Super Admin 或授权管理员可批准、拒绝、分配角色。
- 审核操作写入 audit logs。
- 注册本身不自动生成工单、报价、发票、付款或保修。

---

### 5. Supabase 新用户 trigger 可能被 metadata 设置高权限角色

**问题：**
如果新用户注册时直接信任 metadata 中的 role，攻击者可能通过注册 metadata 请求管理员或工程师权限。

**解决方案：**
加固新用户 profile trigger：

- 默认角色保持 customer / pending。
- 管理员和工程师角色必须通过后台审核。
- 禁止公开注册直接写入 admin role。
- 敏感 `SECURITY DEFINER` 函数撤销 public / anon / authenticated RPC 执行权限。

---

### 6. `search_all_records()` 全局搜索权限过宽

**问题：**
全局搜索如果允许 customer / engineer 直接搜索全库，会导致客户资料、工单、付款、发票、保修、AI 日志、社媒消息等敏感信息泄露。

**解决方案：**
收紧 RPC 权限：

- `search_all_records()` 从 public / anon / authenticated 撤销直接执行。
- 仅通过后台受控 API 和管理员权限调用。
- 全局搜索结果按角色、模块、字段白名单控制。

---

### 7. RLS 不完整，部分表可能无法满足生产数据隔离

**问题：**
OA 系统涉及客户、工程师、管理员、公共表单、社媒、AI、备份、付款、保修等多类数据，单纯依赖前端隐藏不安全，必须数据库层 RLS 兜底。

**解决方案：**
已补齐多批 RLS migration：

- `20260526004000_v28_1_2_field_work_rls_policies.sql`
- `20260526005000_v28_1_2_security_definer_access_hardening.sql`
- `20260526006000_v28_1_2_core_business_rls_policies.sql`
- `20260526007000_v28_1_2_module_rls_policies.sql`

覆盖内容包括：

- 客户只读自己的资料、工单、发票、保修。
- 工程师只读 / 更新分配给自己的任务、照片、签名、检查表。
- 管理员可管理核心业务表。
- Audit logs 只允许管理员读取，不做普通全量写入开放。
- OTP、password reset、webhook、AI logs、backup records 等敏感模块受限。
- `latest_module_health` 改为 `security_invoker = true`。

---

### 8. 现场作业模块缺少完整权限边界

**问题：**
工程师现场作业涉及 job assignments、job photos、job checklists、customer signatures。若权限不严，工程师可能查看或修改不属于自己的作业资料。

**解决方案：**
已为现场作业表加入工程师归属 RLS：

- `job_assignments_engineer_own`
- `job_assignments_engineer_status_update`
- `job_checklists_engineer_assigned`
- `job_photos_engineer_assigned`
- `customer_signatures_engineer_assigned`

原则：工程师只能操作已分配给自己的 job，管理员可统一管理。

---

### 9. 网站 CMS 和官网内容管理未完全纳入后台

**问题：**
网站内容不能只写死在前端代码中。除一级/二级栏目固定大图结构外，首页文字区块、服务内容、社媒链接、SEO 内容等应可由后台管理。

**解决方案：**
已加入 Website Management CMS 工作区和公开读取 API：

- 页面 / 内容块管理
- 草稿、发布、版本、审计基础
- `website_social_links` 表
- `/api/admin/website-social-links`
- `/api/public/website-social-links`
- `WebsiteSocialLinksWorkspace`

公共网站社媒链接与后台平台 API token 分离，避免把私密平台绑定信息暴露给官网。

---

### 10. 社媒账号绑定与公开社媒链接混在一起

**问题：**
官网展示的 Facebook、Instagram、TikTok、YouTube 链接，与后台社媒平台 API token / account binding 不是同一类数据。混用会造成安全和维护问题。

**解决方案：**
拆分为两类：

1. `website_social_links`：公开官网展示链接，可通过 public API 读取。
2. `social_accounts`：后台社媒平台绑定、token reference、状态、平台信息，仅管理员可管理。

相关 API：

- `/api/admin/social-accounts`
- `/api/admin/website-social-links`
- `/api/public/website-social-links`

---

### 11. 备份与下载中心缺少上线安全约束

**问题：**
OA 系统备份涉及业务数据、RLS、migrations、audit logs、storage manifest 等，不能无权限下载，也不能导出明文密码、API key、未脱敏敏感信息。

**解决方案：**
已加入备份相关表、API 和门禁检查：

- `backup_jobs`
- `backup_schedules`
- `/api/admin/backups/jobs`
- 备份文件要求加密。
- `.env.example` 记录 `NANOFIX_BACKUP_ENCRYPTION_KEY`。
- 备份操作必须写入 audit logs。
- 后续恢复功能必须走 Super Admin 权限和审计流程。

---

### 12. 系统健康检查和模块隔离不足

**问题：**
OA 系统上线后需要知道每个模块是否健康。如果一个模块出错，不应拖垮整个系统。

**解决方案：**
已加入：

- `/api/health`
- `/api/ready`
- `/api/system/module-health-worker`
- `app_modules`
- `module_health_events`
- `latest_module_health`
- Vercel cron 健康检查任务

目标：Dashboard 可汇总模块健康状态，模块出错时降级显示，不影响其他模块。

---

### 13. 数据库外键未全部建立覆盖索引，影响 OA 查询性能

**问题：**
Supabase Performance Advisor 提示多个外键没有覆盖索引。OA 系统大量使用客户、工单、报价、发票、付款、保修、现场作业联表查询，外键无索引会导致数据量上升后查询慢、删除/更新约束慢、后台列表卡顿。

**解决方案：**
已补两批外键性能索引：

第一批：

- `20260526008000_v28_1_2_oa_fk_performance_indexes.sql`

第二批：

- `20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql`

覆盖关键表包括：

- `service_requests`
- `bookings`
- `inspections`
- `quotations`
- `quotation_versions`
- `jobs`
- `job_assignments`
- `job_checklists`
- `job_photos`
- `customer_signatures`
- `invoices`
- `invoice_items`
- `payments`
- `payment_events`
- `receipts`
- `warranties`
- `social_messages`
- `social_publish_versions`
- `customer_center_records`
- `customer_portal_versions`
- `engineer_portal_versions`
- `ai_operation_versions`
- `auth_otp_logs`
- `password_reset_requests`
- `webhook_retry_jobs`

抽查确认存在的关键索引：

- `job_assignments_job_id_idx`
- `service_requests_intake_id_idx`
- `warranties_job_id_idx`
- `bookings_service_request_id_fk_idx`
- `service_requests_customer_id_fk_idx`
- `quotations_service_request_id_fk_idx`
- `warranties_customer_id_fk_idx`

---

### 14. 部署前缺少统一 OA 上线门禁

**问题：**
如果只跑普通 build，可能漏掉权限、RLS、注册审核、外键索引、备份、健康检查等 OA 上线关键条件。

**解决方案：**
已新增 OA 上线专用验证脚本：

- `tools/verify-oa-production-readiness.mjs`
- `npm run verify:oa-readiness`

并已加入：

- `validate:predeploy`
- `tools/validate-unified-package.mjs`

验证范围包括：

- 登录 / 注册别名
- 后台权限 header 清理
- 事务状态流转
- audit logs
- field work RLS
- security definer hardening
- core business RLS
- module RLS
- backup env
- Vercel health worker
- OA 外键索引 batch A / batch B

---

### 15. package-lock / npm registry / Node 版本部署一致性

**问题：**
如果 package-lock 中含内部 npm 镜像，或 Node 版本本地与 Vercel / GitHub 不一致，容易导致部署失败。

**解决方案：**
上线检查要求：

- `.npmrc` 使用 `registry=https://registry.npmjs.org/`
- `.npmrc` 启用 `engine-strict=true`
- `.nvmrc` pin Node 20
- `package.json` engines 限制 `>=20.11.0 <23`
- `package-lock.json` 不允许出现 npmmirror / cnpm / taobao / verdaccio / localhost:4873 等内部 registry

---

### 16. Vercel 构建状态出现 build-rate-limit

**问题：**
最新 GitHub commit 的 Vercel 状态显示 failure，原因是 Vercel build-rate-limit，不是代码编译错误。

**解决方案：**
处理方式：

1. 等待 Vercel 构建额度恢复。
2. 重新触发部署。
3. 正式部署前必须本地执行：

```powershell
npm.cmd run validate:predeploy
npm.cmd run build:ci
```

确认通过后再执行：

```powershell
vercel.cmd --prod
```

---

### 17. PR 仍未合并，且 mergeable=false

**问题：**
PR #1 当前仍然 open，且 mergeable=false。此前判断原因是功能分支与 main 存在分歧，需要同步 main 或解决冲突后再合并。

**解决方案：**
上线前必须执行：

```powershell
git checkout v28-1-1-operable-admin-phase-1
git pull origin main
git push origin v28-1-1-operable-admin-phase-1
```

如果 `tailwind.config.ts` 冲突，保留功能分支中的完整后台颜色和 admin theme 配置。

---

## 三、当前系统上线状态判断

当前版本可以定义为：

**V28.1.2 OA Production Candidate / OA 正式上线候选版**

不建议在 PR 未合并、Vercel build-rate-limit 未恢复、Supabase leaked password protection 未开启前直接正式上线。

当前评分：

- 安全底座：92 / 100
- 数据库结构：93 / 100
- RLS / 权限隔离：92 / 100
- 审计日志：90 / 100
- 业务 CRUD 闭环：86 / 100
- 注册 / 登录 / 审核：90 / 100
- 备份与健康检查：88 / 100
- Vercel / GitHub / Supabase 部署准备：86 / 100
- 整体上线候选分：89–91 / 100

完成最后上线动作后，目标可提升至 94–96 / 100。

---

## 四、正式上线前必须完成的动作

### 1. Supabase Dashboard 手动开启密码泄露保护

路径：

```text
Authentication → Security → Password protection → Enable leaked password protection
```

### 2. 同步 main 到功能分支并处理 PR mergeable=false

```powershell
git checkout v28-1-1-operable-admin-phase-1
git pull origin main
git push origin v28-1-1-operable-admin-phase-1
```

### 3. 本地执行完整门禁

```powershell
npm.cmd run validate:predeploy
npm.cmd run build:ci
```

### 4. 等待 Vercel build-rate-limit 恢复并重新触发部署

确认构建不是 rate-limit，而是真正通过。

### 5. 合并 PR 到 main 后部署生产

```powershell
git checkout main
git pull origin main
vercel.cmd --prod
```

---

## 五、后续 V28.1.3 建议优化

以下不阻断 V28.1.2 上线，但建议作为下一阶段优化：

1. 优化 RLS policy 中 `auth.uid()` / `current_setting()` 的 initplan 性能问题。
2. 合并现场作业表的 multiple permissive policies，减少 RLS 重复执行。
3. 运行一段真实数据后再判断 unused index 是否删除，不要现在删除。
4. 将 legacy visual lock 中仍需要 `unsafe-inline` 的样式逐步组件化，最终收紧 CSP。
5. 做一次真实备份恢复演练，验证 Backup & Download Center 的恢复链路。
6. 为付款 webhook 增加真实支付平台签名验证、幂等、重放保护压测。
7. 为 Customer Portal、Engineer Portal 增加更完整的 E2E 测试。
8. 为 Dashboard 增加真实 SLA、逾期、待审批、待付款、待保修提醒。
9. 为 Website CMS 增加完整版本回滚、发布审批、SEO Schema 预览。
10. 为 Social AI 审核中心增加多平台真实模拟预览和发布排期闭环。

---

## 六、后续开发必须遵守的项目记忆规则

1. 以后继续开发 NANOFIX V28，应以 V28.1.2 OA Production Candidate 为基础。
2. 任何后台 API 不得信任前端传来的 role header。
3. 客户只能进入 Customer Portal，不能进入 Admin。
4. 工程师只能操作被分配的 job。
5. 管理员 / 工程师账号必须经过后台审核后生效。
6. 状态流转必须使用事务 RPC，不得前端直接分散更新状态和日志。
7. 新业务表必须同步设计 RLS、索引、审计、健康检查和验证脚本。
8. 外键必须建立覆盖索引。
9. 备份、导出、下载必须加密、限权、审计，不得导出明文密码或密钥。
10. 所有上线前必须跑 `npm.cmd run validate:predeploy` 和 `npm.cmd run build:ci`。
11. Vercel / GitHub / Supabase 三个平台的部署兼容性必须作为每次修改后的固定检查项。

---

## 七、文档用途

本文档用于：

- 记录已修复的问题和解决方案。
- 作为后续继续修复、开发、审计、部署的项目记忆依据。
- 给开发人员、运维人员、后台管理员理解本轮 V28.1.2 OA 上线加固内容。
- 作为 V28.1.3 性能优化和最终生产上线 checklist 的基础。
