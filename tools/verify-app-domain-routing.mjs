#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function check(ok, label) { return { ok: Boolean(ok), label }; }

const domains = read('lib/nanofix/domains.ts');
const middleware = read('middleware.ts');
const loginPage = read('app/login/page.tsx');
const adminPage = read('app/admin/page.tsx');

const checks = [
  check(domains.includes("https://www.nanofixsg.com"), 'public website domain remains www.nanofixsg.com'),
  check(domains.includes("https://app.nanofixsg.com"), 'admin app domain is app.nanofixsg.com'),
  check(domains.includes('isNanofixProductionHost'), 'production host helper exists'),
  check(middleware.includes('isNanofixAdminAppHost') && middleware.includes('isNanofixProductionHost'), 'middleware uses app-domain and production-host checks'),
  check(middleware.includes('pathname === "/"') && middleware.includes('"?role=admin"'), 'app root redirects to admin login'),
  check(middleware.includes('shouldForceAdminAppHost(pathname)'), 'admin paths are forced to app domain on production hosts'),
  check(!middleware.includes('"/engineer-register": "engineer"'), 'engineer register alias is removed'),
  check(!middleware.includes('"/engineer-register/:path*"'), 'engineer register matcher is removed'),
  check(loginPage.includes('robots: { index: false, follow: false }'), 'login page is noindex'),
  check(adminPage.includes('Central Admin Backend') || adminPage.includes('总管理后台'), 'admin page remains backend entry')
];

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
if (failed.length) {
  console.error(`\nApp domain routing validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nApp domain routing validation passed.');
