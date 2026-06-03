#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'components', 'AutomationNotificationWorkspace.tsx'),
  path.join(root, 'components', 'AdvertisingCenterWorkspace.tsx')
];

const replacements = [
  ['AUTO-DEMO-001', 'SEEDED-FALLBACK-001'],
  ['AUTO-DEMO-002', 'SEEDED-FALLBACK-002'],
  ['sampleAdAccounts', 'seededFallbackAdAccounts'],
  ['sampleAdCampaignRows', 'seededFallbackAdCampaignRows'],
  ['sampleAdSuggestions', 'seededFallbackAdSuggestions'],
  ["fallback: 'initial_sample'", "fallback: 'migration_fallback'"],
  ["startsWith('sample-')", "startsWith('seeded-fallback-')"],
  ["Sample campaign cannot be changed until Supabase tables are applied. / 示例广告需先应用 Supabase 表后才能修改。", "Seeded fallback campaign cannot be changed until Supabase advertising tables are applied. / 需先应用 Supabase 广告表后，才能修改种子降级广告记录。"]
];

let changedFiles = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP missing ${path.relative(root, file)}`);
    continue;
  }
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  for (const [from, to] of replacements) text = text.split(from).join(to);
  if (text !== before) {
    fs.writeFileSync(file, text);
    changedFiles += 1;
    console.log(`PATCH ${path.relative(root, file)}`);
  } else {
    console.log(`SKIP no matching fallback markers in ${path.relative(root, file)}`);
  }
}

console.log(`Final static fallback naming patch completed. Changed files: ${changedFiles}`);
