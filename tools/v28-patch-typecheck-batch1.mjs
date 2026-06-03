#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const skipDirs = new Set(['.git', '.next', 'node_modules', 'reports', 'out', 'dist', 'coverage']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (sourceExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function patchFile(file, mutator) {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, 'utf8');
  const after = mutator(before, file);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`PATCH ${rel(file)}`);
    return true;
  }
  return false;
}

let changes = 0;

// Add marketing_admin to the AdminRole union wherever the strict role union is declared.
for (const file of walk(root)) {
  changes += patchFile(file, (text) => {
    if (!text.includes('AdminRole') || !text.includes('operations_admin') || text.includes("'marketing_admin'")) return text;
    return text.replace(
      /('operations_admin'\s*\|\s*'finance')/g,
      "'operations_admin' | 'marketing_admin' | 'finance'"
    ).replace(
      /('operations_admin'\s*\|\s*'content_admin')/g,
      "'operations_admin' | 'marketing_admin' | 'content_admin'"
    );
  }) ? 1 : 0;
}

// Fix Next lint rule: do not assign to reserved variable name `module` in utility scripts.
const deepAudit = path.join(root, 'tools', 'v28-admin-0-8-reality-deep-audit.mjs');
changes += patchFile(deepAudit, (text) => text
  .replace(/for \(const module of modules\) \{/g, 'for (const moduleDef of modules) {')
  .replace(/module\.page/g, 'moduleDef.page')
  .replace(/module\.keywords/g, 'moduleDef.keywords')
  .replace(/module\.index/g, 'moduleDef.index')
  .replace(/module\.key/g, 'moduleDef.key')
  .replace(/module\.title/g, 'moduleDef.title')
  .replace(/module\.route/g, 'moduleDef.route')
  .replace(/moduleIssues\(module,/g, 'moduleIssues(moduleDef,')
) ? 1 : 0;

const riskPrinter = path.join(root, 'tools', 'v28-print-functional-closure-risks.mjs');
changes += patchFile(riskPrinter, (text) => text
  .replace(/const rows = modules\.flatMap\(\(module\) => \(module\.issues \|\| \[\]\)\.map\(\(issue\) => \(\{ module, issue \}\)\)\);/, "const rows = modules.flatMap((moduleDef) => (moduleDef.issues || []).map((issue) => ({ module: moduleDef, issue })));" )
  .replace(/for \(const module of modules\) \{/g, 'for (const moduleDef of modules) {')
  .replace(/const missing = \(module\.matchedApis \|\| \[\]\)/g, 'const missing = (moduleDef.matchedApis || [])')
  .replace(/console\.log\(`\$\{module\.key\}: \$\{missing\.join\(', '\)\}`\);/g, "console.log(`${moduleDef.key}: ${missing.join(', ')}`);")
) ? 1 : 0;

console.log(`Typecheck/lint batch 1 patch completed. Changed file groups: ${changes}`);
