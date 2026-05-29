# NANOFIX V28.1.7 Continuation Memory & Handoff — 2026-05-29

Purpose: preserve the latest decisions and code-handoff context from the long V28 conversation so the project can continue in a new ChatGPT conversation without losing context. This is a consolidated memory and continuation file, not a verbatim transcript.

## Canonical prior memories

Continue to preserve and respect:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_6_FINAL_CHAT_MEMORY_20260527.md`

This V28.1.7 file is the latest continuation layer after V28.1.6.

## Current project anchors

- Repo: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
- Public website domain: `https://www.nanofixsg.com`
- Admin app domain: `https://app.nanofixsg.com`
- Customer portal preferred URL: `https://www.nanofixsg.com/customer`
- Customer portal backup URL: `https://www.nanofixsg.com/customerlb`
- Internal admin preferred URL: `https://app.nanofixsg.com/admin`
- Internal admin backup URL: `https://app.nanofixsg.com/adminb`
- Supabase project ref: `qjwcjttdyzsgexswbygt`
- Production build rule: `build:ci` must remain standard `next build`.

## Final login / registration architecture

Two separated entry systems:

```text
A. Customer Portal / 客户会员中心
   - Customer Register / 客户注册
   - Customer Login / 客户登录
   - Customer submits new repair / warranty claim
   - Customer views own repair, quote, invoice, payment, warranty and review records only

B. Internal Admin App / 网站总管理后台
   - Super Admin / 总管理员
   - Admin / 管理员
   - Inspection & Repair / 工程师 / 检修
   - Operations / 运营
   - Finance / 财务
   - All internal roles share one register/login page with role selector
```

Rules:

- Customer Portal must not enter the central Admin sidebar.
- Engineer Portal / Engineer Register / Engineer Login are not standalone entries.
- Engineers are internal users under `Inspection & Repair` role inside Internal Admin App.
- Internal staff registration is reviewed by Super Admin; role group can be corrected before approval.
- Super Admin has full-system takeover authority, but all takeover actions must be explicit and written to Audit Logs.

## Customer Portal final functions

```text
Customer Portal / 客户会员中心
├─ Customer Register / 客户注册
├─ Customer Login / 客户登录
├─ Submit Request / 客户提交请求
│  ├─ New Repair Request / 新增维修
│  └─ Warranty Claim / 保修范围申请
├─ My Repair Requests / 我的报修记录
├─ My Quotations / 我的报价
├─ My Invoices / 我的发票
├─ My Payments & Receipts / 我的付款与收据
├─ My Warranties / 我的保修
├─ Submit Review / 客户发表评论
├─ My Reviews / 我的评价
└─ Review Privacy Settings / 评价公开信息设置
```

Customer request rules:

- `New Repair Request` creates a new service request.
- `Warranty Claim` links to an existing warranty record and is reviewed as in-warranty / out-of-warranty / requires new quote.
- Customer can only see records bound to their own customer identity.
- Customer review submission must let customer choose which personal information is public/hidden.

## Final central Admin sidebar menu 0–8

The left sidebar must remain 0–8 only:

```text
0. Global Search & Admin Home / 全局搜索与后台首页
1. Dashboard, Analytics & Alerts / 仪表盘、数据分析与预警
2. Service & Order Operations / 服务与订单运营
3. Website Management / 网站后台管理
4. Social Media Management / 社媒管理
5. Advertising & Promotion Center / 广告投放与推广中心
6. AI Intelligence Center / AI 智能中心
7. Customer Center / 客户中心
8. Website & System Settings / 网站与系统设置
```

Sidebar interaction rules:

- On `/admin`, all first-level menu groups default collapsed.
- Clicking a first-level menu only expands/collapses; it must not jump away.
- Clicking a second-level menu changes the right workspace and preserves AdminShell.
- Existing module page keeps its current first-level group expanded.
- Advertising Center and Customer Center must never leave the central Admin sidebar environment.
- Use glossy irregular sky-blue gradients instead of dry hard blue.

## Recent code changes already made in this conversation

### Admin navigation

Updated:

- `data/adminNavigation.ts`

Purpose:

- Locked the final V28.1.6/V28.1.7 0–8 sidebar menu.
- Advertising submenus changed to hash workspace links to avoid route jumping.

### AdminShell sidebar behavior

Updated:

- `components/AdminShell.tsx`

Purpose:

- `/admin` defaults all groups collapsed.
- Current module keeps its first-level menu expanded.
- First-level click expands/collapses only.
- Same-page hash navigation updates right workspace without breaking AdminShell.

### Dashboard actionable workspace

Updated:

- `components/Dashboard.tsx`

Purpose:

- Dashboard now acts as executive summary only: important KPIs, urgent actions, cross-module alerts, intake/lead summary, finance summary, operations summary, channel performance snapshot, approvals and system health.
- Dashboard does not hold full detailed operations; detail handling routes back to original modules.
- Organic and paid channels are separated:
  - Website Organic
  - Website Paid
  - Social Organic
  - Social Paid Ads
  - Google Business Organic
  - Google Ads
- Advertising ROI must only use paid ads data.

### Advertising Center routing cleanup

Updated:

- `app/admin/advertising-center/page.tsx`
- `app/admin/advertising-center/import/page.tsx`
- `app/admin/advertising-center/insights/page.tsx`
- `app/admin/advertising-center/creatives/page.tsx`
- `app/admin/advertising-center/budgets/page.tsx`

Purpose:

- Advertising Center now stays inside AdminShell.
- Legacy subpages redirect to `/admin/advertising-center#...` anchors.
- Avoid old behavior where advertising menu left the central Admin shell.

### Service Operations action panel

Created:

- `components/ServiceOperationsActionPanel.tsx`

Purpose:

- Adds actionable service operations panel.
- Supports selected record detail and actions:
  - Open processing workspace
  - Assign owner
  - Update status
  - Super Admin override
  - Audit preview

Needs follow-up:

- Ensure `app/service-operations/page.tsx` imports and renders `ServiceOperationsActionPanel` after `WorkflowBoard` and before `StatusMachineTable`.
- If not already committed, connect it.

### Customer Center action workspace

Created:

- `components/CustomerCenterActionWorkspace.tsx`

Updated:

- `app/customer-center/page.tsx`

Purpose:

- Customer Center now includes:
  - Pending Customer Binding / 待绑定客户
  - Review Approval & Privacy Redaction / 评价审核与隐私脱敏
  - Review Display Locations / 评价展示位置管理
  - Review Privacy Settings / 评价公开信息设置
- Review operations include:
  - Approve with redaction
  - Request revision
  - Archive
  - Soft delete
  - Audit preview
- Display locations include:
  - Homepage Carousel
  - Service Page Block
  - Track Record Page
  - Internal Only

### Public website mobile carousel arrows

Updated:

- `components/LegacyWebsitePage.tsx`

Purpose:

- Injects mobile-only carousel arrows into horizontally scrollable carousel-like blocks.
- On mobile, both sides show triangle/arrow controls.
- Clicking left/right arrow scrolls one card/image width.
- Shows hint: `Tap arrows to slide / 点击三角滑动`.
- Must be tested on mobile because legacy HTML class names may vary.

### Customer review to website columns

Confirmed business rule:

- Customer reviews must connect to website columns.
- Approved reviews can be pushed to:
  - Homepage Carousel / 首页滚动评论
  - No-Hacking Repair service page
  - Leak Detection service page
  - Waterproofing Works service page
  - Track Record & Warranty page
  - Testimonials / client review sections
- Customer Center controls review approval/privacy/redaction.
- Website Management controls where approved reviews display.
- Admin can hide more info, but cannot reveal customer-hidden information without new consent.

## Key business logic to preserve

### Dashboard

Dashboard must remain simple and important:

- Executive overview
- Urgent action queue
- Cross-module alerts
- Intake and lead summary
- Revenue and finance summary
- Operations summary
- Channel performance snapshot
- Approval center summary
- System health summary

Dashboard should not become the detailed place for every module.

### Service & Order Operations

Purpose:

- Leads
- Service Requests
- Inspection Scheduling
- Inspections
- Quotations
- Quotation Approval
- Jobs
- Work Execution
- Engineer Assignment as business field only
- Progress Updates
- Invoices
- Payments
- Receipts
- Warranty Records
- Warranty Generation Rules
- Rework
- Status Flow & Logs
- Super Admin Takeover & Override

Super Admin can act as engineer/operations/finance/admin when workflow is stuck, but every takeover must include reason and audit trail.

### Customer Center

Customer Center owns:

- Customer profiles
- Customer 360 timeline
- Pending customer binding
- Binding review and merge
- Customer source history
- Repair tracking
- Customer-linked quotes/invoices/payments/warranties
- Customer Portal management
- Customer reviews
- Review privacy settings
- Testimonials & reviews
- Review approval and privacy redaction
- Review display locations
- Review archive
- Review deletion and audit
- Consent and PDPA log
- PDPA/privacy requests
- Customer access control

### Review privacy rules

Default:

- Full name hidden by default.
- Phone / WhatsApp / Email always hidden.
- Full address / unit number always redacted.
- Photos/videos require explicit consent.
- Invoice amount hidden by default.

Admin can hide more.
Admin cannot force reveal customer-hidden information without new consent.
Super Admin can urgently hide/unpublish, with audit log.

### Website Management

Website Management should become true CMS:

- Homepage content
- Customer review carousel
- Page content
- Service page content
- Service testimonials block
- Track Record & Warranty content
- Client Testimonials display
- Guide library
- FAQ & Tips
- SEO/AEO library
- AI Website Content Generator
- Forms & Public Submission
- Public Form Submissions
- Public Upload Review
- Website Organic Leads
- Website Paid Landing Leads
- Media Library
- Preview
- Publish Approval
- Version History
- Website Leads & Analytics

Website content generation must be draft-only until admin approval.

### Advertising Center

Advertising detail stays inside Advertising Center, not Dashboard.

Advertising owns:

- Campaign dashboard
- Campaign planning
- Create campaign draft
- CSV / Excel import
- ROI insights and alerts
- Creatives and copy
- Budgets and strategy
- Approval gates
- Ad account connections
- Paid social ads
- Google Ads
- UTM & landing pages
- Click-to-WhatsApp Ads
- Paid lead attribution
- CPL / ROAS / ROI comparison
- Daily spend review
- Finance review
- Super Admin takeover
- Ad logs

Paid and organic must remain separated.

### Social Media Management

Future actionable workspace should include:

- Unified Social Inbox
- WhatsApp AI Reply, editable before sending
- Transfer to Human
- Review & Comment Management
- Google / Facebook Review Import
- Organic Social Leads
- Social Organic Conversion
- AI Social Content Studio
- Multi-Platform Preview Review
- Schedule / Publish Approval
- Campaign Posting Queue
- Social Logs
- Social Performance

AI cannot auto-publish.

### AI Intelligence Center

AI default must be:

- Suggest
- Draft
- Recommend

AI must not automatically:

- Publish
- Approve
- Pay
- Delete
- Reveal customer privacy
- Execute takeover

AI-generated suggestions must be editable before sending/publishing.

### Website & System Settings

System Settings owns:

- Company Settings
- Brand assets
- Admin Login Branding
- Customer Portal Login Branding
- Internal Staff Login & Registration
- Customer Portal Login & Registration
- API Integrations
- Supabase Settings
- GitHub / Vercel Deployment Settings
- Search Settings
- Role Groups & Permissions
- Admin Accounts
- Admin Registration Review
- Super Admin Override Rules
- Backup & Download Center
- QR Backend Management
- Attribution Rules
- Public API Monitor
- No-Login Repair Intake Security
- Review Privacy & Publishing Rules
- Public Display Consent Rules
- Review Archive & Deletion Rules
- Audit Logs
- Health Checks
- Error Boundaries & Module Isolation
- Security Settings

## Automation & Notification Engine — latest planned continuation

The last active design stage was Automation & Notification, then Internal Inbox.

Needs code implementation:

- `components/AutomationNotificationWorkspace.tsx`
- Connect to `app/system-settings/page.tsx`

Suggested workspace contents:

- Workflow SLA Engine
- Notification Rules
- Escalation Engine
- Customer Timeline & Escalation
- Automation Audit Preview
- Internal Inbox
- Task Queue
- SLA Alerts
- Escalation Center
- Takeover Workspace
- Internal Notes
- AI Priority Queue
- Cross-Module Tasks
- Complaint Escalation
- Inbox Audit Logs

The prior attempt to create `components/AutomationNotificationWorkspace.tsx` failed with GitHub 422 because the API indicated `sha wasn't supplied`, meaning the file may already exist or GitHub content state conflicted. In the next chat, first fetch the file path before create/update.

## Mobile carousel requirement

User confirmed:

1. On mobile, all carousel image/text sections must show triangle indicators on both sides.
2. Tapping one triangle once moves one card/image.
3. This applies to all horizontal carousel-like sections.
4. Must preserve existing website visual layout.

Current approach:

- `LegacyWebsitePage.tsx` injects mobile arrows dynamically.
- Needs mobile test after build.

## Login / Register visual standard

Customer Portal login/register and Internal Admin App login/register pages must use the public website homepage first hero image: NANOFIX worker talking with the female customer.

Rules:

- Full-page background image.
- Slight black overlay.
- Keep image visible and premium.
- Login/register card white or translucent white.
- Customer pages warm/service-oriented.
- Admin pages secure/operational.

## Next conversation starting prompt

Use this in a new chat:

```text
继续 NANOFIX V28 项目。请以 GitHub 记忆文档：
docs/NANOFIX_V28_1_7_CONTINUATION_MEMORY_20260529.md
作为最新项目记忆依据。

当前继续目标：
1. 先检查并修复最近已改代码是否构建通过。
2. 确认 LegacyWebsitePage 手机端轮播三角按钮是否正常。
3. 确认 Customer Review 可以推送到 Homepage Carousel / Service Page / Track Record。
4. 继续实现 AutomationNotificationWorkspace，并接入 System Settings。
5. 接着实现 Internal Inbox / Task Center / Super Admin Takeover 工作区。
6. 所有修改必须保持 AdminShell，左侧 0–8 菜单稳定，不要跳出总后台。
7. 修复后运行 validate/predeploy/build 检查，并给出结果。
```

## Immediate technical checklist for next chat

1. Fetch current files:
   - `components/LegacyWebsitePage.tsx`
   - `components/CustomerCenterActionWorkspace.tsx`
   - `components/ServiceOperationsActionPanel.tsx`
   - `app/service-operations/page.tsx`
   - `app/customer-center/page.tsx`
   - `app/system-settings/page.tsx`
   - `components/AutomationNotificationWorkspace.tsx` if it exists
2. Confirm `LegacyWebsitePage.tsx` compiles after mobile carousel injection.
3. If TypeScript fails due to script string escaping, repair it first.
4. Connect `ServiceOperationsActionPanel` to `app/service-operations/page.tsx` if missing.
5. Create/update `AutomationNotificationWorkspace.tsx` correctly after fetching SHA.
6. Connect it below `BackupCenter` and `RbacTable` in System Settings.
7. Add anchors or MenuAnchorSections if needed.
8. Keep build pipeline:
   - `npm run validate:predeploy`
   - `npm run build:ci`
9. Do not deploy production until build is clean.

## Safety / architecture rules

- Customer Portal cannot access Admin APIs.
- Customer Portal cannot search backend Media Center.
- Customer can only see own records.
- Backend APIs must not trust role headers.
- Avoid `select('*')` on sensitive backend APIs.
- Super Admin full override is allowed only with audit logs.
- No standalone Engineer Portal/Register/Login.
- AI cannot auto-publish or auto-approve.
- Public repair form remains no-login.
- QR display is backend-only; public website QR sections disabled.
