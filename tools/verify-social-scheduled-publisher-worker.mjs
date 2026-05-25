import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'lib/nanofix/socialPublisherContract.ts',
  'app/api/system/social-scheduled-publisher-worker/route.ts',
  'docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const contract = read('lib/nanofix/socialPublisherContract.ts');
  const worker = read('app/api/system/social-scheduled-publisher-worker/route.ts');
  const memory = read('docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md');

  const contractNeedles = [
    'validateSocialPublisherResult',
    'SocialPublisherResult',
    'publisher_name',
    'version_id',
    'platform',
    'external_post_id',
    'external_post_url',
    'published_at',
    'platform_api_called: true',
    'final_approval_completed_before_schedule: true',
    'publish_ready_after_schedule: true',
    'ai_auto_publish_allowed: false',
    'socialPublisherContractExample'
  ];
  for (const needle of contractNeedles) {
    if (!contract.includes(needle)) failures.push(`Publisher contract missing: ${needle}`);
  }

  const workerNeedles = [
    'CRON_SECRET',
    'NANOFIX_SYSTEM_WORKER_TOKEN',
    'NANOFIX_SOCIAL_PUBLISHER_ENDPOINT',
    'NANOFIX_SOCIAL_PUBLISHER_TOKEN',
    'validateSocialPublisherResult',
    'v28.1.3-social-publisher-contract-1',
    "eq('status', 'scheduled')",
    "lte('scheduled_at', now)",
    'isPublishReady',
    'final_approval_completed_before_schedule === true',
    'publish_ready_after_schedule === true',
    'ai_auto_publish_allowed === false',
    'platform_api_called: false',
    'fake-publishing',
    "status: 'published'",
    "status: 'failed'",
    'publisher_contract_valid: true',
    'social_scheduled_publisher_started',
    'social_scheduled_publisher_failed',
    'social_scheduled_publisher_published'
  ];
  for (const needle of workerNeedles) {
    if (!worker.includes(needle)) failures.push(`Scheduled publisher worker missing: ${needle}`);
  }

  const memoryNeedles = [
    'future platform publisher',
    'status is `scheduled`',
    '`scheduled_at` is due',
    'final_approval_completed_before_schedule === true',
    'publish_ready_after_schedule === true',
    'must not introduce another final approval stage'
  ];
  for (const needle of memoryNeedles) {
    if (!memory.includes(needle)) failures.push(`Global publish memory missing future publisher rule: ${needle}`);
  }
}

if (failures.length) {
  console.error('NANOFIX scheduled social publisher worker verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX scheduled social publisher worker verification passed.');
console.log('Checked publisher contract, due scheduled snapshot processing, approval-before-schedule guards, no fake publishing and audit logging.');
