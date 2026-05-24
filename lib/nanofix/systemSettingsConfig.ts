export type SystemSettingsSectionKey =
  | 'company-settings'
  | 'logo-brand-assets'
  | 'admin-login-branding'
  | 'api-integrations'
  | 'supabase-settings'
  | 'github-vercel-deployment-settings'
  | 'search-settings'
  | 'qr-backend-management'
  | 'qr-generate-download'
  | 'backup-download-center'
  | 'central-database-backup'
  | 'module-backup-schedules'
  | 'restore-logs'
  | 'permissions-rbac'
  | 'roles'
  | 'audit-logs'
  | 'pdpa-privacy-settings'
  | 'retention-rules'
  | 'breach-assessment-workflow'
  | 'health-checks'
  | 'environment-variables-reminder';

export type SystemSettingsSectionConfig = {
  key: SystemSettingsSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'records' | 'audit' | 'health' | 'backup' | 'rbac' | 'versions';
  category: string;
  sensitive: boolean;
  helper: string;
};

export const systemSettingsSections: SystemSettingsSectionConfig[] = [
  { key: 'company-settings', href: '/system-settings/company-settings', title: 'Company Settings', zh: '公司设置', tab: 'records', category: 'company', sensitive: false, helper: 'Manage company profile, contact information, business hours and local operating notes.' },
  { key: 'logo-brand-assets', href: '/system-settings/logo-brand-assets', title: 'Logo & Brand Assets', zh: 'LOGO 与品牌素材', tab: 'records', category: 'brand', sensitive: false, helper: 'Manage logo path, brand colours, public asset notes and admin reuse rules.' },
  { key: 'admin-login-branding', href: '/system-settings/admin-login-branding', title: 'Admin Login Branding', zh: '后台登录品牌显示', tab: 'records', category: 'brand', sensitive: false, helper: 'Manage admin login logo, favicon, brand title and safe UI copy.' },
  { key: 'api-integrations', href: '/system-settings/api-integrations', title: 'API Integrations', zh: 'API 集成', tab: 'records', category: 'integrations', sensitive: true, helper: 'Record integration names and server-only environment variable references. Never store raw secret keys here.' },
  { key: 'supabase-settings', href: '/system-settings/supabase-settings', title: 'Supabase Settings', zh: 'Supabase 设置', tab: 'records', category: 'supabase', sensitive: true, helper: 'Track Supabase project, URL, RLS and server-only secret references without exposing service-role keys.' },
  { key: 'github-vercel-deployment-settings', href: '/system-settings/github-vercel-deployment-settings', title: 'GitHub / Vercel Deployment Settings', zh: 'GitHub/Vercel 部署设置', tab: 'records', category: 'deployment', sensitive: true, helper: 'Track GitHub/Vercel deployment settings, build commands and environment variable reminders.' },
  { key: 'search-settings', href: '/system-settings/search-settings', title: 'Search Settings', zh: '搜索设置', tab: 'records', category: 'search', sensitive: false, helper: 'Manage search categories, RLS-filtered result group notes and audit settings.' },
  { key: 'qr-backend-management', href: '/system-settings/qr-backend-management', title: 'QR Backend Management', zh: '后台二维码管理', tab: 'records', category: 'qr', sensitive: false, helper: 'Manage backend-only QR generation settings. Public website QR display remains disabled.' },
  { key: 'qr-generate-download', href: '/system-settings/qr-generate-download', title: 'QR Generate / Download', zh: '二维码生成/下载', tab: 'records', category: 'qr', sensitive: false, helper: 'Manage QR generation/download records and signed-link policy notes.' },
  { key: 'backup-download-center', href: '/system-settings/backup-download-center', title: 'Backup & Download Center', zh: '模块备份与下载中心', tab: 'backup', category: 'backup', sensitive: true, helper: 'Manage module backup records, encrypted download notes, retention and restore workflow.' },
  { key: 'central-database-backup', href: '/system-settings/central-database-backup', title: 'Central Database Backup', zh: '中心数据库备份', tab: 'backup', category: 'backup', sensitive: true, helper: 'Manage central database backup schedule notes and Supabase backup policy reminders.' },
  { key: 'module-backup-schedules', href: '/system-settings/module-backup-schedules', title: 'Module Backup Schedules', zh: '模块备份计划', tab: 'backup', category: 'backup_schedule', sensitive: false, helper: 'Manage per-module backup frequency, time zone, retry and notification notes.' },
  { key: 'restore-logs', href: '/system-settings/restore-logs', title: 'Restore Logs', zh: '恢复日志', tab: 'backup', category: 'restore', sensitive: true, helper: 'Review restore logs and recovery operation records.' },
  { key: 'permissions-rbac', href: '/system-settings/permissions-rbac', title: 'Permissions / RBAC', zh: '权限/RBAC', tab: 'rbac', category: 'rbac', sensitive: true, helper: 'Review roles, permissions, access scopes and admin-only policy records.' },
  { key: 'roles', href: '/system-settings/roles', title: 'Roles', zh: '角色', tab: 'rbac', category: 'roles', sensitive: true, helper: 'Manage role notes and allowed permission groups. Do not expose raw auth tokens.' },
  { key: 'audit-logs', href: '/system-settings/audit-logs', title: 'Audit Logs', zh: '审计日志', tab: 'audit', category: 'audit', sensitive: true, helper: 'Search system audit logs by actor, object, action and time.' },
  { key: 'pdpa-privacy-settings', href: '/system-settings/pdpa-privacy-settings', title: 'PDPA / Privacy Settings', zh: 'PDPA/隐私设置', tab: 'records', category: 'privacy', sensitive: true, helper: 'Manage PDPA/privacy policy settings and customer data handling notes.' },
  { key: 'retention-rules', href: '/system-settings/retention-rules', title: 'Retention Rules', zh: '数据保留规则', tab: 'records', category: 'retention', sensitive: true, helper: 'Manage data retention rules, archive notes and deletion/soft-delete policy records.' },
  { key: 'breach-assessment-workflow', href: '/system-settings/breach-assessment-workflow', title: 'Breach Assessment Workflow', zh: '数据泄露评估流程', tab: 'records', category: 'breach', sensitive: true, helper: 'Manage breach assessment workflow, escalation notes and notification rules.' },
  { key: 'health-checks', href: '/system-settings/health-checks', title: 'Health Checks', zh: '健康检查', tab: 'health', category: 'health', sensitive: false, helper: 'Review readiness/health check notes and module degraded-mode records.' },
  { key: 'environment-variables-reminder', href: '/system-settings/environment-variables-reminder', title: 'Environment Variables Reminder', zh: '环境变量提醒', tab: 'records', category: 'environment', sensitive: true, helper: 'Track required environment variables and reminders. Secret values must remain server-only and never be stored here.' }
];

export function getSystemSettingsSection(key: string | undefined) {
  return systemSettingsSections.find((section) => section.key === key) || null;
}
