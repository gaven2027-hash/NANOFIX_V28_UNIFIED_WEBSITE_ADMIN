import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const navFile = path.join(root, 'data/adminNavigation.ts');
const realityFile = path.join(root, 'data/adminModuleReality.ts');
const outDir = path.join(root, 'docs');
const outFile = path.join(outDir, 'NANOFIX_V28_ADMIN_REALITY_MATRIX.md');

const nav = fs.readFileSync(navFile, 'utf8');
const reality = fs.readFileSync(realityFile, 'utf8');

const menuBlocks = [...nav.matchAll(/order: '([^']+)'[\s\S]*?href: '([^']+)'[\s\S]*?title: '([^']+)'[\s\S]*?zh: '([^']+)'[\s\S]*?children: \[([\s\S]*?)\n\s*\]/g)];
const realityEntries = new Map();

for (const match of reality.matchAll(/entry\(\{ href: '([^']+)', status: '([^']+)'[\s\S]*?risk: '([^']+)'[\s\S]*?apis: \[([^\]]*)\][\s\S]*?writeActions: \[([^\]]*)\][\s\S]*?auditActions: \[([^\]]*)\][\s\S]*?nextStep: '([^']*)'[\s\S]*?evidence: '([^']*)'/g)) {
  realityEntries.set(match[1], {
    status: match[2],
    risk: match[3],
    apis: match[4].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
    writeActions: match[5].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
    auditActions: match[6].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
    nextStep: match[7],
    evidence: match[8]
  });
}

for (const mapMatch of reality.matchAll(/\.\.\.\[([^\]]+)\]\.map\(\(anchor\) => entry\(\{ href: `([^`]+)`[\s\S]*?status: '([^']+)' as const[\s\S]*?risk: '([^']+)' as const[\s\S]*?apis: \[([^\]]*)\][\s\S]*?writeActions: \[([^\]]*)\][\s\S]*?auditActions: \[([^\]]*)\][\s\S]*?nextStep: '([^']*)'[\s\S]*?evidence: '([^']*)'/g)) {
  const anchors = [...mapMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const hrefTemplate = mapMatch[2];
  for (const anchor of anchors) {
    const href = hrefTemplate.replace('${anchor}', anchor);
    realityEntries.set(href, {
      status: mapMatch[3],
      risk: mapMatch[4],
      apis: mapMatch[5].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
      writeActions: mapMatch[6].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
      auditActions: mapMatch[7].replace(/'/g, '').split(',').map((item) => item.trim()).filter(Boolean),
      nextStep: mapMatch[8],
      evidence: mapMatch[9]
    });
  }
}

const rows = [];
for (const block of menuBlocks) {
  const [, order, parentHref, parentTitle, parentZh, childBlock] = block;
  for (const childMatch of childBlock.matchAll(/child\('([^']+)', '([^']+)', '([^']+)'\)/g)) {
    const href = childMatch[1];
    const title = childMatch[2];
    const zh = childMatch[3];
    const entry = realityEntries.get(href) || { status: 'missing', risk: 'P0', apis: [], writeActions: [], auditActions: [], nextStep: 'No registry entry. Create real page/API/audit metadata.', evidence: 'Missing from adminModuleReality.ts' };
    const isReal = entry.status === 'live' && entry.apis.length > 0 && !entry.apis.join(' ').includes('or module-specific') && !entry.apis.join(' ').includes('to_be_defined') && entry.auditActions.length > 0;
    rows.push({ order, parentHref, parentTitle, parentZh, href, title, zh, ...entry, isReal });
  }
}

const summary = rows.reduce((acc, row) => {
  acc.total += 1;
  acc[row.status] = (acc[row.status] || 0) + 1;
  if (row.isReal) acc.real += 1;
  return acc;
}, { total: 0, real: 0, live: 0, partial: 0, contract: 0, missing: 0 });

const byParent = new Map();
for (const row of rows) {
  const group = byParent.get(row.order) || { title: row.parentTitle, zh: row.parentZh, rows: [] };
  group.rows.push(row);
  byParent.set(row.order, group);
}

const lines = [];
lines.push('# NANOFIX V28 Admin Reality Matrix / 总后台真实功能审计矩阵');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Summary / 汇总');
lines.push('');
lines.push(`- Total submenu items / 二级栏目总数: ${summary.total}`);
lines.push(`- Real live modules with API + audit / 真实接口与审计模块: ${summary.real}`);
lines.push(`- Live registry / 标记 Live: ${summary.live}`);
lines.push(`- Partial / 部分真实: ${summary.partial}`);
lines.push(`- Contract / 契约占位: ${summary.contract}`);
lines.push(`- Missing registry / 缺少登记: ${summary.missing}`);
lines.push('');
lines.push('> Rule: A submenu is counted as production-real only when it is marked `live`, has a concrete API route, and has Audit Log actions. Generic reality-panel buttons are not counted as production operations.');
lines.push('');

for (const [order, group] of [...byParent.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  lines.push(`## ${order}. ${group.title} / ${group.zh}`);
  lines.push('');
  lines.push('| Submenu | Reality | Risk | Real? | APIs | Write Actions | Audit Actions | Next Step |');
  lines.push('|---|---:|---:|---:|---|---|---|---|');
  for (const row of group.rows) {
    lines.push(`| ${row.title} / ${row.zh}<br/><code>${row.href}</code> | ${row.status} | ${row.risk} | ${row.isReal ? 'YES' : 'NO'} | ${row.apis.join('<br/>') || '-'} | ${row.writeActions.join('<br/>') || '-'} | ${row.auditActions.join('<br/>') || '-'} | ${row.nextStep.replace(/\|/g, '/')} |`);
  }
  lines.push('');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'));
console.log(JSON.stringify({ ok: true, summary, output: 'docs/NANOFIX_V28_ADMIN_REALITY_MATRIX.md' }, null, 2));
