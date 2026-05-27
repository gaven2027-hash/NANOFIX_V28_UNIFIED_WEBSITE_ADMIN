# NANOFIX V28.1.6 Final Chat Memory — 2026-05-27

Purpose: preserve the key decisions from the long NANOFIX V28 conversation so work can continue in a new chat/page without losing context. This is a consolidated memory, not a verbatim transcript.

## Canonical project basis

- Repo: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
- Vercel project: `nanofix-v28-unified`
- Public domain: `https://www.nanofixsg.com`
- Admin app domain: `https://app.nanofixsg.com`
- Root domain: `nanofixsg.com` redirects to `www.nanofixsg.com`
- Supabase ref: `qjwcjttdyzsgexswbygt`
- Preserve prior memory: `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- Preserve prior repair/member/menu memory: `docs/NANOFIX_V28_1_5_REPAIR_MEMBER_REGISTRATION_AND_ADMIN_MENU_MEMORY.md`

## Final login / registration architecture

There are two separated entry systems:

```text
A. Customer Portal / 客户会员中心
   - Customer Register / 客户注册
   - Customer Login / 客户登录
   - Customers only enter their own portal

B. Internal Admin App / 网站总管理后台
   - Super Admin / 总管理员
   - Admin / 管理员
   - Inspection & Repair / 工程师 / 检修
   - Operations / 运营
   - Finance / 财务
   - All internal roles share one register/login page with a role selector
```

Recommended URLs:

```text
Customer Portal: https://www.nanofixsg.com/customer
Customer backup: https://www.nanofixsg.com/customerlb
Internal Admin: https://app.nanofixsg.com/admin
Admin backup: https://app.nanofixsg.com/adminb
```

Rules:

- Customer Portal is separate from the central Admin backend.
- Customer Portal must not appear as a central Admin first-level sidebar module.
- Engineer Portal / Engineer Register / Engineer Login are not standalone entries anymore.
- Engineers are internal roles inside Internal Admin App, not an independent public/admin portal.
- Internal staff registration is reviewed by Super Admin; role group can be corrected before approval.

## Customer Portal final menu

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
- Customers can view only their own bound records.
- Customers can submit reviews and choose which personal information is public/hidden.

## Public repair and member registration backend flow

Homepage has two entry points:

1. Submit Repair Request / Book Inspection
2. Register Member / Customer Login

They remain separate first, then converge in Customer Center.

Public repair flow:

```text
Public repair form
↓
/api/public/service-requests
↓
unified_intake
↓
leads
↓
service_requests
↓
Customer Center → Pending Customer Binding
↓
Inspection → Quotation → Job → Invoice → Payment → Receipt → Warranty
```

Rules:

- Public quick repair submission must remain no-login and fast.
- No forced registration/password/OTP for quick repair submission.
- Public repair form does not directly create warranty.
- Unregistered repairs start as `binding_status = pending`.
- Logged-in customer repairs can be `binding_status = linked`.
- Possible phone/email/WhatsApp/address matches use `binding_status = manual_review`.

Member registration flow:

```text
Customer registration
↓
Supabase Auth
↓
/api/public/registration-requests
↓
portal_registration_requests
↓
Customer Center → Customer Profiles
↓
Customer Portal
```

Rules:

- Registration creates identity, not a job by itself.
- Registration does not automatically create quote/invoice/payment/warranty.
- Optional register + repair creates a linked service request only after registration/verification.

## Super Admin authority

Super Admin has full highest authority across all Admin modules. Super Admin can act on behalf of any internal role to prevent workflow blockage, including engineer tasks, finance approvals, operations tasks, content approvals, advertising approvals, and stuck service workflows.

Rules:

- No silent impersonation.
- Every takeover must be explicit and auditable.
- Every takeover must include reason/note.
- Audit must record actual operator, acting role, original assignee, timestamp, before/after values, linked record, and audit log ID.
- Super Admin can hide more customer information, but cannot publish information the customer chose to hide unless new consent is obtained.

Menus affected:

```text
Dashboard → Urgent Action Queue / Approval Center Summary
Service & Order Operations → Super Admin Takeover & Override
Advertising & Promotion Center → Super Admin Takeover
Website & System Settings → Super Admin Override Rules
```

## Final central Admin menu 0–8

```text
0. Global Search & Admin Home / 全局搜索与后台首页
├─ Global Search
├─ Module Launch Board
├─ Recent Activity
├─ My Pending Tasks
├─ Quick Create
└─ System Shortcut Panel

1. Dashboard, Analytics & Alerts / 仪表盘、数据分析与预警
├─ Executive Overview
├─ Urgent Action Queue
├─ Cross-Module Alerts
├─ Intake & Lead Summary
├─ Revenue & Finance Summary
├─ Operations Summary
├─ Channel Performance Snapshot
├─ Approval Center Summary
└─ System Health Summary

2. Service & Order Operations / 服务与订单运营
├─ Leads
├─ Service Requests
├─ Inspection Scheduling
├─ Inspections
├─ Quotations
├─ Quotation Approval
├─ Jobs
├─ Work Execution
├─ Engineer Assignment（业务字段）
├─ Progress Updates
├─ Invoices
├─ Payments
├─ Receipts
├─ Warranty Records
├─ Warranty Generation Rules
├─ Rework
├─ Status Flow & Logs
└─ Super Admin Takeover & Override

3. Website Management / 网站后台管理
├─ Navigation & Menu
├─ Homepage Content
├─ Customer Review Carousel
├─ Page Content
├─ Service Page Content
├─ Service Testimonials Block
├─ Track Record & Warranty Content
├─ Client Testimonials Display
├─ Guide Library
├─ FAQ & Tips
├─ SEO / AEO Library
├─ AI Website Content Generator
├─ Forms & Public Submission
├─ Public Form Submissions
├─ Public Upload Review
├─ Website Organic Leads
├─ Website Paid Landing Leads
├─ Media Library
├─ Preview
├─ Publish Approval
├─ Version History
└─ Website Leads & Analytics

4. Social Media Management / 社媒管理
├─ Social Accounts
├─ Google Business Profile
├─ Unified Social Inbox
├─ WhatsApp AI Reply
├─ Transfer to Human
├─ Live Chat / Webhook Collector
├─ Review & Comment Management
├─ Google / Facebook Review Import
├─ Organic Social Leads
├─ Social Organic Conversion
├─ AI Social Content Studio
├─ Multi-Platform Preview Review
├─ Schedule / Publish Approval
├─ Campaign Posting Queue
├─ Social Logs
└─ Social Performance

5. Advertising & Promotion Center / 广告投放与推广中心
├─ Overview / Campaign Dashboard
├─ Campaign Planning
├─ Create Campaign Draft
├─ CSV / Excel Import
├─ ROI Insights & Alerts
├─ Creatives & Copy
├─ Budgets & Strategy
├─ Approval Gates
├─ Ad Account Connections
├─ Paid Social Ads
├─ Google Ads
├─ UTM & Landing Pages
├─ Click-to-WhatsApp Ads
├─ Paid Lead Attribution
├─ CPL / ROAS / ROI Comparison
├─ Daily Spend Review
├─ Finance Review
├─ Super Admin Takeover
└─ Ad Logs

6. AI Intelligence Center / AI 智能中心
├─ Global Web Search
├─ AI Website Assistant
├─ AI Social Assistant
├─ AI Conversation Intelligence
├─ Lead Discovery & Scoring
├─ AI Attribution Assistant
├─ AI Review Moderation Assist
├─ AI Privacy Redaction Assist
├─ AI Rules
├─ AI API Settings
├─ AI Analysis Logs
├─ AI Alerts
├─ Material AI Suggestions
├─ Usage & Cost
├─ Quotation AI Assist
├─ Invoice AI Assist
└─ Prompt Safety & Audit

7. Customer Center / 客户中心
├─ Customer List
├─ Customer Profiles
├─ Customer 360 Timeline
├─ Pending Customer Binding
├─ Binding Review & Merge
├─ Customer Binding Rules
├─ Data Matching Rules
├─ Lead Source History
├─ Repair Tracking
├─ Quotes Linked to Customer
├─ Invoices Linked to Customer
├─ Payments & Receipts
├─ Warranty Records
├─ Customer Portal Management
├─ Customer Submit Review
├─ My Reviews Management
├─ Review Privacy Settings
├─ Testimonials & Reviews
├─ Review Approval & Privacy Redaction
├─ Review Display Locations
├─ Review Archive
├─ Review Deletion & Audit
├─ Consent & PDPA Log
├─ PDPA / Privacy Requests
└─ Customer Access Control

8. Website & System Settings / 网站与系统设置
├─ Company Settings
├─ Logo & Brand Assets
├─ Admin Login Branding
├─ Customer Portal Login Branding
├─ Internal Staff Login & Registration
├─ Customer Portal Login & Registration
├─ API Integrations
├─ Supabase Settings
├─ GitHub / Vercel Deployment Settings
├─ Search Settings
├─ Role Groups & Permissions
├─ Admin Accounts
├─ Admin Registration Review
├─ Super Admin Override Rules
├─ Backup & Download Center
├─ QR Backend Management
├─ Attribution Rules
├─ Public API Monitor
├─ No-Login Repair Intake Security
├─ Review Privacy & Publishing Rules
├─ Public Display Consent Rules
├─ Review Archive & Deletion Rules
├─ Audit Logs
├─ Health Checks
├─ Error Boundaries & Module Isolation
└─ Security Settings
```

## Attribution rules

Do not mix organic social and paid social into one bucket.

Fields required on lead/service/job/invoice/payment records:

```text
source_platform
source_type = organic / paid_ads / direct / referral / unknown
source_medium = dm / comment / click_to_whatsapp / landing_page / lead_form / call_click
source_campaign_id
utm_source
utm_medium
utm_campaign
first_touch_source
last_touch_source
attribution_confidence
manual_corrected_by
```

Dashboard can show totals. Advertising ROI must use Paid Ads data only.

## Reviews, testimonials and privacy

- Customer Portal: customer submits review and privacy choices.
- Customer Center: admin review, redaction, display name edits, approval, rejection, archive, soft delete, audit.
- Website Management: displays approved reviews in homepage carousel, service testimonials, Track Record & Warranty, and testimonial sections.
- System Settings: privacy/publishing/consent/archive/delete/audit rules.
- AI Intelligence Center: sensitive info detection and redaction suggestions.

Review statuses:

```text
pending_review
approved
rejected
needs_revision
redacted
archived
soft_deleted
```

Important privacy rule: Admin can hide more, but cannot reveal information the customer selected as hidden without new consent.

## Login/register visual standard

Customer Portal login/register and Internal Admin App login/register pages must use the public website homepage first hero image: NANOFIX worker talking with the female customer.

Visual rules:

- Full-page background image.
- Slight black overlay.
- Keep image visible and premium.
- Login/register card is white or translucent white.
- Customer pages feel warm and service-oriented.
- Admin pages feel secure and operational.

## Admin UI behavior and style

- Left first-level menu defaults collapsed after login.
- Clicking a first-level title expands/collapses only.
- A separate manual action opens the module page.
- Clicking a second-level item changes the right workspace while preserving left navigation.
- All Admin operations remain inside AdminShell.
- Advertising Center and Customer Center cannot leave the central Admin sidebar context.
- Replace dry hard blue with glossy irregular sky-blue gradients.
- Use sky blue, lake blue, fresh cyan and milky highlight.

## Immediate backlog for next chat

1. Update `data/adminNavigation.ts` to match this final 0–8 menu.
2. Keep Customer Portal out of Admin sidebar.
3. Remove standalone Engineer Portal/Register/Login from public/admin navigation.
4. Add internal staff register/login role selector.
5. Add Customer Portal request split: New Repair Request and Warranty Claim.
6. Add `/api/public/service-requests`.
7. Ensure public repair form writes unified_intake + leads + service_requests.
8. Add Customer Center pending binding and matching review.
9. Add review submission, privacy settings, approval, redaction, archive, and soft delete flows.
10. Add Super Admin takeover workflow and audit logs.
11. Finish right-side Admin workspace pages one module at a time.
12. Keep Vercel production build using standard `next build` for `build:ci`.
13. Keep OA predeploy gate: `npm run validate:predeploy && npm run build:ci`.
