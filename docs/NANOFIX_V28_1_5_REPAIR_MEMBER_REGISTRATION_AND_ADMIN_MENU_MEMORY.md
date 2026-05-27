# NANOFIX V28.1.5 Memory — Repair Request, Member Registration & Admin Menu

Updated scope: save the confirmed logic for the public website repair request entry, customer member registration entry, Customer Center binding workflow, and the latest left-side Admin OA menu structure after V28 modifications up to the morning checkpoint.

## 1. Public website homepage entry points

The public website homepage has two separate business entry points:

1. Submit Repair Request / Book Inspection / Upload Leakage Photos
2. Register Member / Customer Login

These two entries must not be treated as the same workflow. They enter different backend pipelines first, then converge in Customer Center.

## 2. Submit Repair Request workflow

Purpose: quick repair intake without forcing login, registration, password or OTP.

Correct backend flow:

```text
Public website repair form
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
Admin confirms existing customer / creates new customer / links to member account
↓
Inspection → Quotation → Job → Invoice → Payment → Receipt → Warranty
```

Rules:

- Public repair submission must remain open and fast.
- No forced customer login, member registration, password or OTP for quick repair submission.
- Public repair form should not directly create warranty.
- Public repair form should create intake, lead and service request records.
- Unregistered repair requests start with `binding_status = pending`.
- If a repair request is submitted by an already registered/login customer, it can be `binding_status = linked`.
- If phone/email/WhatsApp/address suggests a match but is not confirmed, it should be `binding_status = manual_review`.
- Customer Center must show pending binding tasks and allow admin confirmation.

Current implementation note:

- Existing `/api/service-requests` has service request creation logic, but currently requires admin permission and should not be the final public website endpoint.
- A dedicated `/api/public/service-requests` endpoint should be added for website quick repair form submission.

## 3. Register Member workflow

Purpose: create customer identity / member account.

Correct backend flow:

```text
Register Member / Customer Login entry
↓
Supabase Auth signUp / login
↓
/api/public/registration-requests
↓
portal_registration_requests
↓
Customer Center → Customer Profiles / Registration Review
↓
profiles / customer account
↓
Customer Portal
↓
Customer can view linked repair requests, quotes, invoices, payments, receipts and warranties
```

Rules:

- Customer registration is separate from repair submission.
- Customer registration creates identity, not a job by itself.
- Member registration should not automatically create quotation, invoice, payment or warranty.
- Customer registration may optionally include a collapsed “Submit Repair Request at the same time” section.
- If the optional repair section is filled, after registration/verification the system should create a linked service request with `binding_status = linked`.
- Customer Portal is for customer self-service view only; it is not the Admin Customer Center.

## 4. Relationship between repair, registration, Customer Center and warranty

Customer Center is the convergence layer.

```text
Repair form → business demand / service request
Member registration → customer identity / profile
Customer Center → binds identity + service demand
Warranty → generated after service completion, not directly from homepage
```

Warranty flow:

```text
Repair request
↓
Inspection
↓
Quotation
↓
Customer confirmation
↓
Job / Work Execution
↓
Invoice / Payment / Receipt
↓
Completion
↓
Warranty Record
↓
Linked to Customer Center + Customer Portal
```

## 5. Customer Center responsibilities

Customer Center must connect both public repair and member registration data.

Required sub-functions:

- Customer List
- Customer Profiles
- Customer 360 Timeline
- Pending Customer Binding
- Binding Review & Merge
- Repair Tracking
- Quotes Linked to Customer
- Invoices Linked to Customer
- Payments & Receipts
- Warranty Records
- Customer Portal Management
- Testimonials & Reviews
- PDPA / Privacy Requests
- Customer Access Control

Customer Center must not be confused with Customer Portal.

- Customer Center = internal admin management center.
- Customer Portal = external customer self-service area.

## 6. Current backend fixes still required

Priority improvements:

1. Add `/api/public/service-requests` for public website quick repair intake.
2. Keep `/api/service-requests` or `/api/admin/service-requests` protected for admin operations.
3. Update public website repair form to call the public endpoint.
4. Add Customer Center pending binding panel.
5. Add phone/email/WhatsApp/address matching suggestions.
6. Add admin confirmation for linking repair requests to customer profiles.
7. Add optional register + repair section to member registration form.
8. Ensure warranty is generated only after job completion/payment/approval workflow.

## 7. Latest confirmed Admin OA left-side menu

The central Admin left-side menu should contain only internal Admin OA modules 0–8. Customer Portal and Engineer Portal must not appear as first-level Admin sidebar modules.

### 0. Global Search & Admin Home / 全局搜索与后台首页

- All Module Launch Board / 全部模块入口总览
- Top Fixed Global Search / 顶部固定全局搜索
- Unified Intake Feed / 统一入口动态
- Module Health & Degraded Mode / 模块健康与降级模式
- Pending Approvals Snapshot / 待审批总览
- Audit & Alerts Snapshot / 审计与预警总览

### 1. Dashboard, Analytics & Alerts / 仪表盘、数据分析与预警

- Main Dashboard / 主仪表盘
- Today’s Tasks / 今日待处理事项
- AI Alerts / AI 预警
- Unified Intake / 统一入口
- New Leads / 新线索
- Pending Customer Binding / 待绑定客户
- Finance Snapshot / 财务快照
- Operations Snapshot / 运营快照
- KPI & Performance / KPI 与绩效
- Reports / 报表中心
- Audit Drill-down / 审计下钻
- Module Health / 模块健康

### 2. Service & Order Operations / 服务与订单运营

- Leads / 线索
- Service Requests / 服务请求 / 报修单
- Inspection Scheduling / 查验排程
- Inspections / 查验记录
- Quotations / 报价
- Quotation Approval / 报价审批
- Jobs / 工单
- Work Execution / 施工执行
- Engineer Assignment / 工程师分配（业务字段）
- Progress Updates / 进度更新
- Invoices / 发票
- Payments / 付款
- Receipts / 收据
- Warranty Records / 保修记录
- Rework / 返工管理
- Status Flow & Logs / 状态流转与日志

### 3. Website Management / 网站后台管理

- Navigation & Menu / 导航与菜单
- Homepage Content / 首页内容
- Page Content / 页面内容
- Service Page Content / 服务页内容
- Guide Library / Guide 内容库
- FAQ & Tips / FAQ 与维护建议
- SEO / AEO Library / SEO / AEO 内容库
- AI Website Content Generator / AI 网站内容生成
- Forms & Public Submission / 表单与公开提交
- Media Library / 媒体素材库
- Preview / 预览
- Publish Approval / 发布审批
- Version History / 版本历史
- Website Leads & Analytics / 网站线索与分析

### 4. Social Media Management / 社媒管理

- Social Accounts / 社媒账号
- Google Business Profile / Google 商家资料
- Unified Social Inbox / 统一社媒收件箱
- WhatsApp AI Reply / WhatsApp AI 回复
- Transfer to Human / 转人工
- Live Chat / Webhook Collector / 在线聊天 / Webhook 收集
- Review & Comment Management / 评论与留言管理
- AI Social Content Studio / AI 社媒内容工作室
- Multi-Platform Preview Review / 多平台并排预览审核
- Schedule / Publish Approval / 排期 / 发布审批
- Campaign Posting Queue / 发布队列
- Social Logs / 社媒日志
- Social Performance / 社媒表现

### 5. Advertising & Promotion Center / 广告投放与推广中心

- Overview / Campaign Dashboard / 总览 / 广告活动面板
- Campaign Planning / 广告策划
- Create Campaign Draft / 创建广告草稿
- CSV / Excel Import / CSV / Excel 导入
- ROI Insights & Alerts / ROI 分析与预警
- Creatives & Copy / 素材与文案
- Budgets & Strategy / 预算与策略
- Approval Gates / 审批闸门
- Ad Account Connections / 广告账号连接
- UTM & Landing Pages / UTM 与落地页
- CPL / ROAS / ROI Comparison / CPL / ROAS / ROI 对比
- Daily Spend Review / 日花费审核
- Finance Review / 财务审核
- Super Admin Takeover / 总管理员接管
- Ad Logs / 广告日志

### 6. AI Intelligence Center / AI 智能中心

- Global Web Search / 全网搜索中心
- AI Website Assistant / AI 网站助手
- AI Social Assistant / AI 社媒助手
- AI Conversation Intelligence / AI 对话智能
- Lead Discovery & Scoring / 线索发现与评分
- AI Rules / AI 规则
- AI API Settings / AI 接口设置
- AI Analysis Logs / AI 分析日志
- AI Alerts / AI 预警
- Material AI Suggestions / 材料 AI 建议
- Usage & Cost / 用量与成本
- Quotation AI Assist / 报价 AI 辅助
- Invoice AI Assist / 发票 AI 辅助
- Prompt Safety & Audit / 提示词安全与审计

### 7. Customer Center / 客户中心

- Customer List / 客户列表
- Customer Profiles / 客户档案
- Customer 360 Timeline / 客户 360 时间线
- Pending Customer Binding / 待绑定客户
- Binding Review & Merge / 绑定审核与合并
- Repair Tracking / 维修进度追踪
- Quotes Linked to Customer / 客户关联报价
- Invoices Linked to Customer / 客户关联发票
- Payments & Receipts / 客户付款与收据
- Warranty Records / 客户保修记录
- Customer Portal Management / 客户门户管理
- Testimonials & Reviews / 客户评价与见证
- PDPA / Privacy Requests / 隐私请求
- Customer Access Control / 客户访问控制

### 8. Website & System Settings / 网站与系统设置

- Company Settings / 公司设置
- Logo & Brand Assets / Logo 与品牌素材
- Admin Login Branding / 后台登录品牌
- API Integrations / API 集成
- Supabase Settings / Supabase 设置
- GitHub / Vercel Deployment Settings / GitHub / Vercel 部署设置
- Search Settings / 搜索设置
- Role Groups & Permissions / 角色分组与权限
- Admin Accounts / 管理员账号
- Admin Registration Review / 管理员注册审核
- Backup & Download Center / 备份与下载中心
- QR Backend Management / 后台二维码管理
- Audit Logs / 审计日志
- Health Checks / 健康检查
- Error Boundaries & Module Isolation / 错误边界与模块隔离
- Security Settings / 安全设置

## 8. Admin sidebar behavior

Required Admin sidebar behavior:

- Default state after login: all first-level modules collapsed.
- Click a first-level module title: expand/collapse only; do not force page jump.
- A separate manual action may open the module page.
- Click a second-level module: keep left sidebar unchanged and show the selected full workspace on the right side.
- All Admin operations must remain inside the central Admin shell.
- Advertising Center and Customer Center must not leave the central Admin sidebar context.
- Customer Portal and Engineer Portal must not be shown as Admin first-level modules.

## 9. Engineer-related rule

Standalone Engineer Portal and standalone Engineer Registration entry are removed from the central Admin sidebar and public registration flow.

Engineer-related business fields may remain inside Service & Order Operations, such as:

- Engineer Assignment
- Inspection Scheduling
- Work Execution
- Progress Updates
- Field uploads

This means engineer data remains as operations data, but no standalone engineer registration/admin entry should appear.

## 10. Admin visual style rule

The dry hard blue admin UI should be replaced with glossy, moist, irregular sky-blue gradient styling.

Preferred style:

- Irregular sky-blue gradient
- Glossy highlights
- Soft lake-blue / azure-blue / light cyan transitions
- Slight milky-white highlight
- Avoid flat dry pure-blue blocks

Suggested color basis:

- Sky Blue: `#4FA9FF`
- Lake Blue: `#6FD3FF`
- Fresh Cyan: `#83E0E8`
- Milky Highlight: `#F5FBFF`
- Active Blue: `#48B8FF`

## 11. Additional menu improvement suggestions

Recommended additions / refinements to consider before finalising the left sidebar:

1. Add “Public Form Submissions / 公开表单提交” under Website Management or Service & Order Operations if the team wants a direct public intake review screen.
2. Add “Customer Binding Rules / 客户绑定规则” under Customer Center, separate from the binding review queue.
3. Add “Warranty Generation Rules / 保修生成规则” under Website & System Settings or Service & Order Operations to define when warranty is created.
4. Add “Public API Monitor / 公开接口监控” under Website & System Settings for `/api/public/service-requests` and `/api/public/registration-requests` health checks.
5. Add “Public Upload Review / 公开上传审核” under Website Management or Service & Order Operations for leakage photos/videos submitted by customers.
6. Add “Data Matching Rules / 数据匹配规则” under Customer Center for phone/email/WhatsApp/address duplicate matching.
7. Add “Consent & PDPA Log / 同意与隐私日志” under Customer Center or System Settings for customer registration and repair form consent records.
8. Add “No-Login Repair Intake Security / 免登录报修安全” under System Settings for rate limiting, abuse prevention and spam review.
9. Add “Repair Source Attribution / 报修来源归因” under Dashboard or Advertising Center to connect website, ads, social, WhatsApp and QR leads.
10. Add “Operational SLA Rules / 运营 SLA 规则” under Dashboard or Service Operations for P0/P1/P2 handling time rules.
