import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(exists('app/layout.tsx'), 'Missing app/layout.tsx');
assert(exists('package.json'), 'Missing package.json');

if (!failures.length) {
  const layout = read('app/layout.tsx');
  const pkg = read('package.json');

  for (const marker of [
    'application/ld+json',
    '@context',
    '@graph',
    'Organization',
    'LocalBusiness',
    'HomeAndConstructionBusiness',
    'WebSite',
    'Service',
    'NANOFIX',
    'https://www.nanofixsg.com',
    '+65 80387877',
    'Leak Detection',
    'No-Hacking Leak Repair',
    'PU Injection',
    'Waterproofing Works',
    'addressCountry',
    'Singapore',
    'sameAs',
    'instagram.com/nanofixsg',
    'tiktok.com/@nanofixsg',
    'youtube.com/@nanofixsg'
  ]) assert(layout.includes(marker), `Structured data missing marker: ${marker}`);

  for (const placeholder of ['实际地址', '+65 xxxx xxxx', 'Nanofixit Singapore']) {
    assert(!layout.includes(placeholder), `Structured data contains placeholder or inconsistent brand: ${placeholder}`);
  }

  assert(pkg.includes('verify:seo-aeo-structured-data'), 'package.json missing verify:seo-aeo-structured-data script.');
  assert(pkg.includes('verify-seo-aeo-structured-data.mjs'), 'package.json missing SEO/AEO verifier file reference.');
  assert(pkg.includes('validate:predeploy') && pkg.includes('npm run verify:seo-aeo-structured-data'), 'validate:predeploy must run verify:seo-aeo-structured-data.');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-seo-aeo-structured-data', failures }, null, 2));
if (failures.length) process.exit(1);
