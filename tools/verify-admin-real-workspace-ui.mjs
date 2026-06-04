import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path, { join, dirname, resolve } from 'node:path';

const root = process.cwd();
const dailyRoutes = [
  '/admin',
  '/dashboard',
  '/service-operations',
  '/website-management',
  '/social-media',
  '/admin/advertising-center',
  '/ai-intelligence',
  '/customer-center'
];

const diagnosticRoute = '/system-settings';
const forbiddenDailyText = [
  'PARTIAL',
  'Tables / 数据表',
  'APIs / 接口',
  'Audit / 审计',
  'Task / 任务',
  'Refresh Live Data',
  'Write Audit Check',
  'Create Follow-up Task',
  'Open Linked API',
  'Open Main Workspace',
  'Module Diagnostics / 模块诊断',
  'Submodule Operations / 二级模块操作台'
];
const allowedDiagnosticsFiles = new Set([
  'components/AdminSubmoduleWorkspace.tsx',
  'components/SystemSettingsDiagnosticsWorkspace.tsx',
  'app/system-settings/page.tsx',
  'tools/verify-admin-real-workspace-ui.mjs'
]);
const sourceRoots = ['app', 'components', 'data', 'tools'];
const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];

function projectPath(value) {
  return path.normalize(value).replace(/\\/g, '/');
}

function toPagePath(route) {
  if (route === '/') return 'app/page.tsx';
  return projectPath(join('app', route.replace(/^\//, ''), 'page.tsx'));
}

function read(filePath) {
  return readFileSync(join(root, filePath), 'utf8');
}

function anchorFromHref(href) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

function parseMenu(content) {
  const entries = [];
  const blockRegex = /href:\s*['"]([^'"]+)['"][\s\S]*?children:\s*\[([\s\S]*?)\n\s*\]/g;
  let block;
  while ((block = blockRegex.exec(content))) {
    const route = block[1];
    const children = [];
    for (const childMatch of block[2].matchAll(/child\(\s*['"]([^'"]+)['"]/g)) {
      children.push(childMatch[1]);
    }
    entries.push({ route, children });
  }
  return entries;
}

function collectFiles(dir, files = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return files;
  for (const entry of readdirSync(abs)) {
    const child = projectPath(join(dir, entry));
    const full = join(root, child);
    const stat = statSync(full);
    if (stat.isDirectory()) collectFiles(child, files);
    else if (extensions.some((ext) => child.endsWith(ext))) files.push(child);
  }
  return files;
}

const allSourceFiles = sourceRoots.flatMap((dir) => collectFiles(dir));
const pathToContent = new Map(allSourceFiles.map((file) => [file, read(file)]));
const aliasToPath = new Map();
for (const file of allSourceFiles) {
  aliasToPath.set('@/' + file.replace(/\.(tsx|ts|jsx|js|mjs)$/, ''), file);
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith('@/')) {
    return aliasToPath.get(specifier) || null;
  }

  if (specifier.startsWith('.')) {
    const fromDir = dirname(fromFile);
    const absoluteBase = resolve(root, fromDir, specifier);
    const base = projectPath(path.relative(root, absoluteBase));
    for (const ext of extensions) {
      if (pathToContent.has(base + ext)) return base + ext;
    }
    for (const ext of extensions) {
      const indexCandidate = projectPath(join(base, 'index' + ext));
      if (pathToContent.has(indexCandidate)) return indexCandidate;
    }
  }

  return null;
}

function importsFor(file) {
  const content = pathToContent.get(file) || '';
  const imports = [];
  const importRegex = /import(?:[\s\S]*?from\s*)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content))) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) imports.push(resolved);
  }
  return imports;
}

function collectDependencyGraph(entryFile) {
  const visited = new Set();
  const queue = [projectPath(entryFile)];
  while (queue.length) {
    const file = queue.shift();
    if (!file || visited.has(file) || !pathToContent.has(file)) continue;
    visited.add(file);
    for (const dep of importsFor(file)) queue.push(dep);
  }
  return [...visited];
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
const menuFile = 'data/adminNavigation.ts';
const menuEntries = parseMenu(read(menuFile));
const menuByRoute = new Map(menuEntries.map((entry) => [entry.route, entry]));

for (const route of [...dailyRoutes, diagnosticRoute]) {
  assert(menuByRoute.has(route), `adminNavigation.ts missing route ${route}`, failures);
}

for (const entry of menuEntries) {
  for (const childHref of entry.children) {
    const base = childHref.split('#')[0] || entry.route;
    const anchor = anchorFromHref(childHref);
    assert(base === entry.route, `submenu href ${childHref} points outside parent route ${entry.route}`, failures);
    assert(Boolean(anchor), `submenu href ${childHref} has an empty hash anchor`, failures);
  }
}

for (const route of dailyRoutes) {
  const pagePath = toPagePath(route);
  assert(existsSync(join(root, pagePath)), `daily admin page missing: ${pagePath}`, failures);
  const files = collectDependencyGraph(pagePath);
  const combined = files.map((file) => `\n/* ${file} */\n${pathToContent.get(file) || ''}`).join('\n');

  assert(combined.includes(`MenuAnchorSections route="${route}"`) || combined.includes(`MenuAnchorSections route={'${route}'}`), `${route} does not render MenuAnchorSections for submenu anchor fallback`, failures);
  assert(!combined.includes('AdminSubmoduleWorkspace'), `${route} imports or renders AdminSubmoduleWorkspace diagnostic UI`, failures);

  for (const phrase of forbiddenDailyText) {
    assert(!combined.includes(phrase), `${route} dependency graph contains diagnostic phrase: ${phrase}`, failures);
  }

  const menuEntry = menuByRoute.get(route);
  for (const childHref of menuEntry?.children || []) {
    const anchor = anchorFromHref(childHref);
    assert(combined.includes(`id={${anchor}`) || combined.includes(`id="${anchor}"`) || combined.includes('data-admin-anchor-fallback'), `${route} has submenu anchor #${anchor} without real id or safe fallback`, failures);
  }
}

const systemFiles = collectDependencyGraph(toPagePath(diagnosticRoute));
const systemCombined = systemFiles.map((file) => pathToContent.get(file) || '').join('\n');
assert(systemCombined.includes('SystemSettingsDiagnosticsWorkspace'), '/system-settings must render SystemSettingsDiagnosticsWorkspace', failures);
assert(systemCombined.includes('AdminSubmoduleWorkspace route="/system-settings"'), '/system-settings diagnostics wrapper must be the only diagnostics entry', failures);

for (const file of allSourceFiles) {
  const content = pathToContent.get(file) || '';
  if (!content.includes('AdminSubmoduleWorkspace')) continue;
  assert(allowedDiagnosticsFiles.has(file), `AdminSubmoduleWorkspace referenced outside system diagnostics boundary: ${file}`, failures);
}

const menuAnchorContent = read('components/MenuAnchorSections.tsx');
assert(!menuAnchorContent.includes('use client'), 'MenuAnchorSections should stay server-safe and not depend on runtime DOM probing', failures);
assert(!menuAnchorContent.includes('AdminSubmoduleWorkspace'), 'MenuAnchorSections must not import or render AdminSubmoduleWorkspace', failures);
assert(menuAnchorContent.includes('data-admin-anchor-fallback'), 'MenuAnchorSections must expose safe hidden anchor fallback markers', failures);

if (failures.length) {
  console.error('V28.4.2 Admin Real Workspace UI verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V28.4.2 Admin Real Workspace UI verification passed.');
console.log(`Checked ${dailyRoutes.length} daily admin routes, ${menuEntries.length} navigation entries and ${allSourceFiles.length} source files.`);
