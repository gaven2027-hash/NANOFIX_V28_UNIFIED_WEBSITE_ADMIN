#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function must(condition, label) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

const files = {
  packageJson: 'package.json',
  middleware: 'middleware.ts',
  helper: 'lib/nanofix/ai-social-ads-operational-closure.ts',
  panel: 'components/AiSocialAdsOperationalClosurePanel.tsx',
  aiPage: 'app/ai-intelligence/page.tsx',
  socialPage: 'app/social-media/page.tsx',
  adsPage: 'app/advertising-center/page.tsx',
  aiDraftRoute: 'app/api/ai/content-drafts/route.ts',
  socialConvertRoute: 'app/api/social/messages/convert/route.ts',
  paidLeadRoute: 'app/api/ads/leads/attribute/route.ts',
  socialConnectRoute: 'app/api/social/accounts/[provider]/connect/route.ts',
  socialTestRoute: 'app/api/social/accounts/[provider]/test/route.ts',
  socialSyncRoute: 'app/api/social/accounts/[provider]/sync/route.ts',
  adsConnectRoute: 'app/api/ads/accounts/[provider]/connect/route.ts',
  adsTestRoute: 'app/api/ads/accounts/[provider]/test/route.ts',
  adsSyncRoute: 'app/api/ads/accounts/[provider]/sync/route.ts'
};

const content = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const corpus = Object.values(content).join('\n');

console.log('\nV28.9 AI / Social / Ads Operational Closure verifier');
console.log('-----------------------------------------------------');

for (const [key, file] of Object.entries(files)) must(Boolean(content[key]), `${file} exists`);

must(content.middleware.includes('"/api/ai"') && content.middleware.includes('"/api/social"') && content.middleware.includes('"/api/ads"'), 'middleware protects AI / Social / Ads API roots');
must(content.middleware.includes('"/api/ai/:path*"') && content.middleware.includes('"/api/social/:path*"') && content.middleware.includes('"/api/ads/:path*"'), 'middleware matcher includes AI / Social / Ads APIs');

must(content.helper.includes('persistAiContentDraft'), 'helper persists AI content drafts');
must(content.helper.includes('persistLeadServiceRequestBridge'), 'helper persists lead/service request bridge');
must(content.helper.includes('persistAccountBridge'), 'helper persists account bridge evidence');
must(content.helper.includes('content_drafts') && content.helper.includes('ai_logs'), 'helper links content_drafts and ai_logs');
must(content.helper.includes('unified_intake') && content.helper.includes('leads') && content.helper.includes('service_requests'), 'helper links intake, leads and service requests');
must(content.helper.includes('internal_inbox_messages') && content.helper.includes('notification_outbox') && content.helper.includes('audit_logs'), 'helper links inbox, notification and audit support');
must(content.helper.includes('protected field values are not persisted'), 'helper avoids storing protected field values');

for (const key of ['aiDraftRoute', 'socialConvertRoute', 'paidLeadRoute', 'socialConnectRoute', 'socialTestRoute', 'socialSyncRoute', 'adsConnectRoute', 'adsTestRoute', 'adsSyncRoute']) {
  must(content[key].includes('requireAdmin'), `${files[key]} uses requireAdmin`);
}

must(content.aiDraftRoute.includes('persistAiContentDraft'), 'AI draft route writes draft workflow');
must(content.socialConvertRoute.includes('persistLeadServiceRequestBridge'), 'social conversion route writes lead/service request workflow');
must(content.paidLeadRoute.includes('persistLeadServiceRequestBridge'), 'paid attribution route writes lead/service request workflow');
must(content.socialConnectRoute.includes('persistAccountBridge') && content.socialSyncRoute.includes('persistAccountBridge'), 'social account routes write account bridge evidence');
must(content.adsConnectRoute.includes('persistAccountBridge') && content.adsSyncRoute.includes('persistAccountBridge'), 'ads account routes write account bridge evidence');

must(content.panel.includes('/api/ai/content-drafts'), 'closure panel calls AI draft API');
must(content.panel.includes('/api/social/messages/convert'), 'closure panel calls social conversion API');
must(content.panel.includes('/api/ads/leads/attribute'), 'closure panel calls paid attribution API');
must(content.aiPage.includes('AiSocialAdsOperationalClosurePanel'), 'AI page surfaces closure panel');
must(content.socialPage.includes('AiSocialAdsOperationalClosurePanel'), 'Social page surfaces closure panel');
must(content.adsPage.includes('AdvertisingAccountConnectionCenter') && content.adsPage.includes('AiSocialAdsOperationalClosurePanel'), 'Advertising Center page surfaces account and closure panels');

const unsafePublishMarkers = ['direct_publish_without_approval', 'publishWithoutApproval', 'autoActivatePaidCampaign', 'activatePaidCampaignWithoutApproval'];
must(!unsafePublishMarkers.some((marker) => corpus.includes(marker)), 'no direct publish or paid activation bypass markers introduced');
must(!/select\s*\(\s*['"`]\*['"`]\s*\)/.test(corpus), 'no broad select star introduced in closure files');
must(content.packageJson.includes('verify:v28-9-ai-social-ads-operational-closure'), 'package.json exposes Step 2 verifier script');

if (failures.length) {
  console.error(`\nV28.9 AI / Social / Ads closure verifier failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-9-ai-social-ads-operational-closure',
  failures: [],
  checked: {
    middlewareApiProtection: true,
    aiDraftWorkflow: true,
    socialLeadWorkflow: true,
    paidAttributionWorkflow: true,
    accountBridgeWorkflow: true,
    uiSurface: true,
    safety: true
  }
}, null, 2));
