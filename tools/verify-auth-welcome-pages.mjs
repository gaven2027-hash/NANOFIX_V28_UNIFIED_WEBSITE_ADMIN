import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'app/login/LoginShell.tsx',
  'app/login/LoginForm.tsx',
  'app/login/page.tsx',
  'app/register/RegisterShell.tsx',
  'app/register/RegisterForm.tsx',
  'app/register/page.tsx',
  'middleware.ts'
];

const roles = ['admin', 'customer', 'engineer'];
const requiredHero = '/assets/images/team_on_site_premium.webp';
const requiredCopy = [
  'NANOFIX Command Center',
  'NANOFIX 总后台控制中心',
  'NANOFIX Premium Member Portal',
  'NANOFIX 高级会员中心',
  'NANOFIX Field Engineer Portal',
  'NANOFIX 工程师现场管理中心',
  'Admin Access Application',
  '管理员权限申请',
  'Premium Member Registration',
  '高级会员注册',
  'Engineer Account Application',
  '工程师账号申请',
  'Request Admin Access',
  '申请管理员权限',
  'Create Premium Member Account',
  '注册高级会员账号',
  'Apply for Engineer Access',
  '申请工程师账号'
];

const requiredAliases = [
  '/admin-login',
  '/customer-login',
  '/engineer-login',
  '/member-sign-up-login',
  '/admin-register',
  '/customer-register',
  '/member-register',
  '/engineer-register'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const loginShell = read('app/login/LoginShell.tsx');
  const registerShell = read('app/register/RegisterShell.tsx');
  const loginForm = read('app/login/LoginForm.tsx');
  const registerForm = read('app/register/RegisterForm.tsx');
  const middleware = read('middleware.ts');

  if (!loginShell.includes(requiredHero)) failures.push('LoginShell must use the homepage first hero image background.');
  if (!registerShell.includes(requiredHero)) failures.push('RegisterShell must use the homepage first hero image background.');

  for (const role of roles) {
    if (!loginForm.includes(`${role}:`)) failures.push(`LoginForm missing role copy: ${role}`);
    if (!registerForm.includes(`${role}:`)) failures.push(`RegisterForm missing role copy: ${role}`);
    if (!middleware.includes(role)) failures.push(`Middleware missing portal role alias target: ${role}`);
  }

  if (!loginForm.includes('/register?role=')) failures.push('LoginForm must link to the matching register role route.');
  if (!registerForm.includes('/login?role=')) failures.push('RegisterForm must link back to the matching login role route.');

  for (const text of requiredCopy) {
    if (!loginForm.includes(text) && !registerForm.includes(text)) failures.push(`Missing bilingual auth welcome copy: ${text}`);
  }

  for (const alias of requiredAliases) {
    if (!middleware.includes(alias)) failures.push(`Missing auth alias route in middleware: ${alias}`);
  }

  if (!middleware.includes('loginAliases') || !middleware.includes('registerAliases')) failures.push('Middleware must keep loginAliases and registerAliases.');
}

if (failures.length) {
  console.error('NANOFIX auth welcome pages verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX auth welcome pages verification passed.');
console.log('Checked role-based login/register welcome copy, hero image background and alias routes.');
