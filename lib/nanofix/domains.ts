export const NANOFIX_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nanofixsg.com';
export const NANOFIX_ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_APP_URL || 'https://app.nanofixsg.com';

export function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
}

export const NANOFIX_PUBLIC_SITE_HOST = hostnameFromUrl(NANOFIX_PUBLIC_SITE_URL);
export const NANOFIX_ADMIN_APP_HOST = hostnameFromUrl(NANOFIX_ADMIN_APP_URL);

export const NANOFIX_ROOT_HOST = 'nanofixsg.com';

export function isNanofixProductionHost(hostname: string) {
  const host = hostname.toLowerCase().split(':')[0];
  return host === NANOFIX_ROOT_HOST || host === NANOFIX_PUBLIC_SITE_HOST || host === NANOFIX_ADMIN_APP_HOST;
}

export function isNanofixAdminAppHost(hostname: string) {
  return hostname.toLowerCase().split(':')[0] === NANOFIX_ADMIN_APP_HOST;
}
