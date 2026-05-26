import type { Metadata } from "next";
import type { CSSProperties } from "react";
import styles from "./admin.module.css";
import {
  adminCenters,
  backupModules,
  editableContentBlocks,
  intakeRecords,
  rbacRows,
  slaRules,
  successMessageRules,
  t,
  workflowSteps
} from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NANOFIX Central Admin Backend | NANOFIX 总管理后台",
  description:
    "Bilingual NANOFIX total management backend for leads, orders, AI, social, customers, website content and settings.",
  robots: {
    index: false,
    follow: false
  }
};

const label = (en: string, zh: string) => `${en} / ${zh}`;

const mediaQuickLinks = [
  {
    href: "/admin/field-media",
    icon: "fa-images",
    title: label("Field Media Center", "现场素材中心"),
    text: label(
      "Customer repair photos, service request files, engineer inspection media, payment proof and warranty attachments.",
      "客户报修照片、服务请求文件、工程师查验素材、付款证明和保修附件。"
    )
  },
  {
    href: "/admin/ai-media",
    icon: "fa-brain",
    title: label("AI Media Center", "AI 素材中心"),
    text: label(
      "AI analysis, reports, quotation support, material references, price sheets and SEO/AEO source assets.",
      "AI 分析、报告、报价辅助、材料参考、价格表和 SEO/AEO 来源素材。"
    )
  },
  {
    href: "/admin/publish-center/media-package",
    icon: "fa-box-open",
    title: label("Publish Media Package", "发布素材包"),
    text: label(
      "Final images, GIFs, videos, thumbnails and files attached to Website or Social publish items.",
      "绑定到官网或社媒发布项的最终图片、GIF、视频、封面和文件。"
    )
  },
  {
    href: "/admin/publish-center",
    icon: "fa-paper-plane",
    title: label("Publish Center", "发布中心"),
    text: label(
      "Human-controlled final publishing gate for website and social content with media package checks.",
      "官网和社媒内容最终人工发布门禁，包含发布素材包检查。"
    )
  }
];

function metricColor(tone: "blue" | "green" | "amber" | "red") {
  return {
    blue: "#2563EB",
    green: "#10B981",
    amber: "#F59E0B",
    red: "#EF4444"
  }[tone];
}

function priorityClass(priority: string) {
  if (priority === "P0") return styles.p0;
  if (priority === "P1") return styles.p1;
  if (priority === "P2") return styles.p2;
  return styles.p3;
}

export default function AdminPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label={label("Central admin navigation", "总管理后台导航")}>
          <div className={styles.brand}>
            <img
              alt="NANOFIX logo"
              className={styles.brandLogo}
              src="/assets/images/nanofix-logo-hd-transparent.png"
            />
            <div>
              <span className={styles.brandName}>NANOFIX</span>
              <span className={styles.brandSub}>{label("Central Admin Backend", "总管理后台")}</span>
            </div>
          </div>

          <nav className={styles.nav}>
            <a className={`${styles.navItem} ${styles.navItemActive}`} href="#dashboard">
              <span className={styles.navIcon}>
                <i className="fa-solid fa-magnifying-glass-chart" aria-hidden="true" />
              </span>
              <span>
                <span className={styles.navTitle}>{label("Global Search", "全局搜索")}</span>
                <span className={styles.navOrder}>{label("Top fixed tool", "顶部固定工具")}</span>
              </span>
            </a>
            <a className={styles.navItem} href="#unified-media">
              <span className={styles.navIcon}>
                <i className="fa-solid fa-photo-film" aria-hidden="true" />
              </span>
              <span>
                <span className={styles.navTitle}>{label("Unified Media", "统一素材")}</span>
                <span className={styles.navOrder}>{label("Upload / URL / Library", "上传 / URL / 素材库")}</span>
              </span>
            </a>
            {adminCenters.map((center) => (
              <a className={styles.navItem} href={`#center-${center.order}`} key={center.order}>
                <span className={styles.navIcon}>
                  <i className={`fa-solid ${center.icon}`} aria-hidden="true" />
                </span>
                <span>
                  <span className={styles.navTitle}>{t(center.title)}</span>
                  <span className={styles.navOrder}>Center {center.order} / 中心 {center.order}</span>
                </span>
              </a>
            ))}
          </nav>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarGrid}>
              <div className={styles.searchBox}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input
                  className={styles.searchInput}
                  aria-label={label("Global internal search", "全局内部搜索")}
                  placeholder={label("Search customers, jobs, content, AI drafts", "搜索客户、工单、内容、AI 草稿")}
                  defaultValue=""
                />
              </div>
              <button className={styles.filterButton} type="button">
                <i className="fa-solid fa-filter" aria-hidden="true" />
                {label("Show Filters", "显示筛选")}
              </button>
              <button className={styles.iconButton} type="button" aria-label={label("Notifications", "通知")}>
                <i className="fa-solid fa-bell" aria-hidden="true" />
                <span className={styles.bellDot} />
              </button>
            </div>
            <div className={styles.filters} aria-label={label("Search filters preview", "搜索筛选预览")}>
              <select className={styles.select} aria-label={label("Module filter", "模块筛选")} defaultValue="all">
                <option value="all">{label("All modules", "全部模块")}</option>
                <option>{label("Service & Orders", "服务与订单")}</option>
                <option>{label("Customer Center", "客户中心")}</option>
                <option>{label("Finance", "财务")}</option>
                <option>{label("AI / Content", "AI / 内容")}</option>
              </select>
              <select className={styles.select} aria-label={label("Priority filter", "优先级筛选")} defaultValue="priority">
                <option value="priority">{label("Any priority", "任意优先级")}</option>
                <option>{label("P0 Critical", "P0 紧急")}</option>
                <option>{label("P1 High", "P1 高优先级")}</option>
                <option>{label("P2 Normal", "P2 普通")}</option>
                <option>{label("P3 Low", "P3 低优先级")}</option>
              </select>
              <select className={styles.select} aria-label={label("Status filter", "状态筛选")} defaultValue="status">
                <option value="status">{label("Any status", "任意状态")}</option>
                <option>{label("Pending review", "待审核")}</option>
                <option>{label("Human required", "需要人工")}</option>
                <option>{label("Overdue", "已超时")}</option>
                <option>{label("Approved", "已批准")}</option>
              </select>
              <select className={styles.select} aria-label={label("Role filter", "角色筛选")} defaultValue="role">
                <option value="role">{label("Role scoped", "按角色范围")}</option>
                <option>{label("Super Admin", "超级管理员")}</option>
                <option>{label("Operations Admin", "运营管理员")}</option>
                <option>{label("Finance", "财务")}</option>
                <option>{label("Engineer", "工程师")}</option>
              </select>
            </div>
          </header>

          <div className={styles.content}>
            <section className={styles.heroBand} id="dashboard">
              <div>
                <div className={styles.eyebrow}>{label("Production admin preview", "生产后台预览")}</div>
                <h1 className={styles.title}>{label("NANOFIX Total Management Backend", "NANOFIX 总管理后台")}</h1>
                <p className={styles.lead}>
                  {label(
                    "A connected management system for acquisition, service requests, inspections, quotations, dispatch, work execution, invoices, payments, warranties, AI content, social inbox, customer binding, permissions, backups and PDPA governance.",
                    "一个连接获客、服务请求、勘查、报价、派工、现场施工、发票、付款、保修、AI 内容、社媒收件箱、客户绑定、权限、备份与 PDPA 治理的总管理系统。"
                  )}
                </p>
              </div>
              <div className={styles.statusStrip} aria-label={label("Daily KPI summary", "每日 KPI 摘要")}>
                <div className={styles.statusTile}>
                  <span className={styles.statusValue}>98%</span>
                  <span className={styles.statusLabel}>{label("Module health", "模块健康度")}</span>
                </div>
                <div className={styles.statusTile}>
                  <span className={styles.statusValue}>5m</span>
                  <span className={styles.statusLabel}>{label("P0 SLA", "P0 响应时限")}</span>
                </div>
                <div className={styles.statusTile}>
                  <span className={styles.statusValue}>2</span>
                  <span className={styles.statusLabel}>{label("Lead entrances", "获客入口")}</span>
                </div>
                <div className={styles.statusTile}>
                  <span className={styles.statusValue}>RLS</span>
                  <span className={styles.statusLabel}>{label("Security scope", "安全范围")}</span>
                </div>
              </div>
            </section>

            <section className={styles.section} id="unified-media">
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>{label("Unified Media Quick Access", "统一素材快捷入口")}</h2>
                  <p className={styles.sectionText}>
                    {label(
                      "All upload and editing modules use the same media source options: local computer upload, URL import and backend media library selection.",
                      "所有上传与编辑模块统一使用本地电脑上传、URL 导入和后台素材库选择三种素材来源。"
                    )}
                  </p>
                </div>
                <a className={styles.primaryButton} href="/admin/field-media">
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  {label("Open Field Media", "打开现场素材")}
                </a>
              </div>
              <div className={styles.opsGrid}>
                {mediaQuickLinks.map((item) => (
                  <article className={styles.opsPanel} key={item.href}>
                    <h3>
                      <i className={`fa-solid ${item.icon}`} aria-hidden="true" /> {item.title}
                    </h3>
                    <p className={styles.sectionText}>{item.text}</p>
                    <a className={styles.ghostButton} href={item.href}>
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                      {label("Open Module", "打开模块")}
                    </a>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>{label("Approved Menu Order", "已确认菜单顺序")}</h2>
                  <p className={styles.sectionText}>
                    {label(
                      "Seven centers remain independent while sharing the central Supabase database contract.",
                      "七大中心保持模块独立，同时共享中央 Supabase 数据库契约。"
                    )}
                  </p>
                </div>
                <button className={styles.primaryButton} type="button">
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                  {label("Audit Safe", "审计安全")}
                </button>
              </div>

              <div className={styles.centerGrid}>
                {adminCenters.map((center) => (
                  <article
                    className={styles.centerCard}
                    id={`center-${center.order}`}
                    key={center.order}
                    style={{ "--accent": center.accent } as CSSProperties}
                  >
                    <div className={styles.centerHead}>
                      <div className={styles.centerIcon}>
                        <i className={`fa-solid ${center.icon}`} aria-hidden="true" />
                      </div>
                      <div>
                        <div className={styles.centerTitleRow}>
                          <span className={styles.centerOrderBadge}>{center.order}</span>
                          <h3>{center.order}. {t(center.title)}</h3>
                        </div>
                        <p>{t(center.subtitle)}</p>
                      </div>
                    </div>
                    <div className={styles.miniMetrics}>
                      {center.metrics.map((metric) => (
                        <div
                          className={styles.miniMetric}
                          key={`${center.order}-${metric.label.en}`}
                          style={{ "--metric": metricColor(metric.tone) } as CSSProperties}
                        >
                          <strong>{metric.value}</strong>
                          <span>{t(metric.label)}</span>
                        </div>
                      ))}
                    </div>
                    <ul className={styles.list}>
                      {center.functions.map((item) => (
                        <li key={item.en}>{t(item)}</li>
                      ))}
                    </ul>
                    <ul className={styles.list}>
                      {center.controls.map((item) => (
                        <li key={item.en}>{t(item)}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>{label("Editable Bilingual Content", "可编辑中英双语内容")}</h2>
                <p className={styles.sectionText}>
                  {label(
                    "Generated admin and website content is stored as editable English and Chinese fields.",
                    "后台与网站生成内容均以可编辑的英文和中文字段保存。"
                  )}
                </p>
              </div>
              <div className={styles.editorGrid}>
                {editableContentBlocks.map((block) => (
                  <article className={styles.editorCard} key={block.key}>
                    <h3>{t(block.label)}</h3>
                    <label className={styles.fieldLabel} htmlFor={`${block.key}-en`}>
                      English
                    </label>
                    <textarea className={styles.textarea} id={`${block.key}-en`} defaultValue={block.english} />
                    <label className={styles.fieldLabel} htmlFor={`${block.key}-zh`}>
                      中文
                    </label>
                    <textarea className={styles.textarea} id={`${block.key}-zh`} defaultValue={block.chinese} />
                    <div className={styles.editorActions}>
                      <button className={styles.primaryButton} type="button">
                        <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                        {label("Save Draft", "保存草稿")}
                      </button>
                      <button className={styles.ghostButton} type="button">
                        <i className="fa-solid fa-eye" aria-hidden="true" />
                        {label("Preview", "预览")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.twoColumn}>
              <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>{label("Unified Intake & Alerts", "统一获客入口与预警")}</h2>
                    <p className={styles.sectionText}>
                      {label(
                        "Quick repair and registered repair flows stay separate to protect conversion and support portal tracking.",
                        "快速报修与注册报修保持独立，以保护转化并支持客户中心追踪。"
                      )}
                    </p>
                  </div>
                  <button className={styles.ghostButton} type="button">
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                    {label("Intake", "获客入口")}
                  </button>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{label("ID", "编号")}</th>
                      <th>{label("Source", "来源")}</th>
                      <th>{label("Customer", "客户")}</th>
                      <th>{label("Issue", "问题")}</th>
                      <th>{label("Priority", "优先级")}</th>
                      <th>{label("Next action", "下一步动作")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakeRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id}</td>
                        <td>{t(record.source)}</td>
                        <td>{record.customer}</td>
                        <td>
                          {t(record.issue)}
                          <br />
                          <span className={styles.sectionText}>{t(record.status)}</span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${priorityClass(record.priority)}`}>{record.priority}</span>
                        </td>
                        <td>{t(record.nextAction)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>{label("SLA & Notification Rules", "SLA 与通知规则")}</h2>
                <p className={styles.sectionText}>
                  {label(
                    "P0 critical items push WhatsApp to admin; P2/P3 remain backend badges, inboxes and logs.",
                    "P0 紧急事项推送 WhatsApp 给管理员；P2/P3 保留在后台角标、收件箱和日志中。"
                  )}
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{label("Priority", "优先级")}</th>
                      <th>{label("Trigger", "触发条件")}</th>
                      <th>{label("Action", "处理动作")}</th>
                      <th>{label("SLA", "响应时限")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaRules.map(([priority, trigger, action, sla]) => (
                      <tr key={priority.en}>
                        <td>{t(priority)}</td>
                        <td>{t(trigger)}</td>
                        <td>{t(action)}</td>
                        <td>{t(sla)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>{label("Customer Success Messages & Buttons", "客户成功提示语与按钮")}</h2>
                <p className={styles.sectionText}>
                  {label(
                    "Every success message is stored in English and Chinese and can be edited before publishing.",
                    "所有成功提示语均以英文和中文保存，并可在发布前编辑。"
                  )}
                </p>
              </div>
              <div className={styles.messageGrid}>
                {successMessageRules.map((rule) => (
                  <article className={styles.messageCard} key={rule.scenario.en}>
                    <h3>{t(rule.scenario)}</h3>
                    <label className={styles.fieldLabel}>English</label>
                    <textarea className={styles.textarea} defaultValue={rule.english} />
                    <label className={styles.fieldLabel}>中文</label>
                    <textarea className={styles.textarea} defaultValue={rule.chinese} />
                    <div className={styles.buttonPreview}>
                      <span className={styles.fakePrimary}>{t(rule.primarySubmitButton)}</span>
                      <span className={styles.fakeSecondary}>{t(rule.nextStepButtons)}</span>
                    </div>
                    <p className={styles.sectionText}>{t(rule.note)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.twoColumn}>
              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>{label("Service Flow Status Machine", "服务流程状态机")}</h2>
                <p className={styles.sectionText}>
                  Lead - Service Request - Inspection - Quotation - Approval - Job - Invoice - Payment - Receipt - Warranty /
                  线索 - 服务请求 - 勘查 - 报价 - 审批 - 工单 - 发票 - 付款 - 收据 - 保修
                </p>
                <div className={styles.workflow}>
                  {workflowSteps.map((step) => (
                    <article className={styles.workflowStep} key={step.name.en}>
                      <div>
                        <strong>{t(step.name)}</strong>
                        <span>{t(step.owner)}</span>
                      </div>
                      <div>
                        <strong>{t(step.status)}</strong>
                        <span>{t(step.guardrail)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>{label("RBAC Permission Matrix", "角色权限矩阵")}</h2>
                <p className={styles.sectionText}>
                  {label(
                    "Admin, customer and engineer scopes are separated. Export, search, publish, reset, backup and restore actions are audit logged.",
                    "管理员、客户和工程师权限范围分离；导出、搜索、发布、重置、备份和恢复动作全部记录审计日志。"
                  )}
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{label("Role", "角色")}</th>
                      <th>{label("Scope", "范围")}</th>
                      <th>{label("Can do", "可执行")}</th>
                      <th>{label("Guardrails", "限制规则")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rbacRows.map(([role, scope, canDo, guardrail]) => (
                      <tr key={role.en}>
                        <td>{t(role)}</td>
                        <td>{t(scope)}</td>
                        <td>{t(canDo)}</td>
                        <td>{t(guardrail)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.opsGrid}>
              <article className={styles.opsPanel}>
                <h3>{label("Dispatch & Field Work", "派工与现场作业")}</h3>
                <ul>
                  <li>{label("Dispatch board by engineer, date, skill and location", "按工程师、日期、技能和地点查看派工板")}</li>
                  <li>{label("ETA, en route, arrived, in progress and completed timestamps", "预计到达、出发、到达、施工中和完成时间记录")}</li>
                  <li>{label("Inspection checklist, before/after photos and customer signature", "勘查清单、施工前后照片和客户签名")}</li>
                  <li>{label("Field media quick access links every photo/video to service request, job and warranty records", "现场素材快捷入口把每张图片/视频关联到报修、工单和保修记录")}</li>
                </ul>
              </article>
              <article className={styles.opsPanel}>
                <h3>{label("Finance Controls", "财务控制")}</h3>
                <ul>
                  <li>{label("Quote versions and approval logs", "报价版本和审批日志")}</li>
                  <li>{label("Unique invoice and receipt numbers", "唯一发票号和收据号")}</li>
                  <li>{label("Payment gateway webhook reconciliation", "支付网关 Webhook 对账")}</li>
                </ul>
              </article>
              <article className={styles.opsPanel}>
                <h3>{label("AI Safety", "AI 安全")}</h3>
                <ul>
                  <li>{label("AI drafts cannot auto-publish", "AI 草稿不可自动发布")}</li>
                  <li>{label("Negative reviews and high-risk replies require human approval", "负面评论和高风险回复必须人工审批")}</li>
                  <li>{label("Prompt version, model, source and reviewer are logged", "记录提示词版本、模型、来源和审核人")}</li>
                  <li>{label("AI Media Center controls approved_for_ai, blocked_for_ai and sensitive_restricted assets", "AI 素材中心控制允许 AI、禁止 AI 和敏感限制素材")}</li>
                </ul>
              </article>
              <article className={styles.opsPanel}>
                <h3>{label("PDPA Governance", "PDPA 数据治理")}</h3>
                <ul>
                  <li>{label("Purpose notice and consent where applicable", "显示用途通知并在适用时获取同意")}</li>
                  <li>{label("Access and correction request workflow", "个人资料访问与更正请求流程")}</li>
                  <li>{label("Encrypted backups and sensitive export approvals", "加密备份和敏感导出审批")}</li>
                </ul>
              </article>
            </section>

            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>{label("Backup & Download Center", "备份与下载中心")}</h2>
                <p className={styles.sectionText}>
                  {label(
                    "Per-module schedules, encrypted backup files, signed links, restore logs and role approval.",
                    "按模块设置备份计划、加密备份文件、签名链接、恢复日志和角色审批。"
                  )}
                </p>
              </div>
              <div className={styles.backupGrid}>
                {backupModules.map((module) => (
                  <div className={styles.backupItem} key={module.en}>
                    <span>{t(module)}</span>
                    <span className={styles.healthy}>
                      <i className="fa-solid fa-circle-check" aria-hidden="true" /> {label("Ready", "就绪")}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <p className={styles.footerNote}>
              {label(
                "Security contract: service role keys, AI keys, WhatsApp/GMB/social tokens and backup keys are server-only. Public website QR sections are prohibited; QR generation and download remain backend settings only.",
                "安全契约：service role key、AI key、WhatsApp/GMB/社媒 token 和备份 key 只能在服务端使用。公开视频网页禁止显示 QR 区块；QR 生成和下载只保留在后台设置。"
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
