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
