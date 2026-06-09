/*
 * V28.6.3.1_ADMIN_WEBSITE_MANAGEMENT_ENTRY
 *
 * Website Management workspace entry marker.
 *
 * Admin UI must expose Website Management for CMS operations:
 * - Website Management
 * - website_pages
 * - website_content_blocks
 * - draft / preview / publish
 * - SEO / AEO / FAQ / Schema / Meta / internal links
 * - Media Library
 * - version history / rollback
 * - audit_logs
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const legacyAdminModuleRedirects: Record<string, string> = {
  'global-search': '/admin#global-search',
  dashboard: '/dashboard',
  operations: '/service-operations',
  website: '/website-management',
  social: '/social-media',
  advertising: '/admin/advertising-center',
  ai: '/ai-intelligence',
  customers: '/customer-center',
  settings: '/system-settings'
};

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  redirect(legacyAdminModuleRedirects[module] ?? '/admin');
}
