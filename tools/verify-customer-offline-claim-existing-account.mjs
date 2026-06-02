import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };

const requiredFiles = [
  'supabase/migrations/202606030001_customer_offline_claim_existing_account.sql',
  'app/api/admin/customers/offline/route.ts',
  'app/api/admin/customers/unclaimed/route.ts',
  'app/api/customer-portal/claim-existing-account/route.ts',
  'app/api/admin/customers/account-claims/route.ts',
  'components/AddOfflineCustomerForm.tsx',
  'components/UnclaimedCustomerProfilesPanel.tsx',
  'components/ClaimExistingAccountForm.tsx',
  'components/CustomerAccountClaimsReviewPanel.tsx',
  'app/customer-center/page.tsx',
  'app/customer-portal/claim-existing-account/page.tsx',
  'components/CustomerPortalShell.tsx',
  'data/adminNavigation.ts',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing Customer Offline / Claim Existing Account file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202606030001_customer_offline_claim_existing_account.sql');
  const offlineApi = read('app/api/admin/customers/offline/route.ts');
  const unclaimedApi = read('app/api/admin/customers/unclaimed/route.ts');
  const publicClaimApi = read('app/api/customer-portal/claim-existing-account/route.ts');
  const adminClaimApi = read('app/api/admin/customers/account-claims/route.ts');
  const offlineForm = read('components/AddOfflineCustomerForm.tsx');
  const unclaimedPanel = read('components/UnclaimedCustomerProfilesPanel.tsx');
  const claimForm = read('components/ClaimExistingAccountForm.tsx');
  const reviewPanel = read('components/CustomerAccountClaimsReviewPanel.tsx');
  const customerCenter = read('app/customer-center/page.tsx');
  const portalClaimPage = read('app/customer-portal/claim-existing-account/page.tsx');
  const portalShell = read('components/CustomerPortalShell.tsx');
  const nav = read('data/adminNavigation.ts');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'portal_status',
    'claim_phone',
    'claim_email',
    'claimed_auth_user_id',
    'customer_account_claims',
    'customer_record_links',
    'customer_account_claims_customer_status_idx',
    'customer_account_claims_identifier_idx'
  ], 'Offline customer claim migration');

  has(offlineApi, [
    'requireAdminApi',
    'admin_offline_entry',
    'portal_status',
    'unclaimed',
    'password_created_by_admin: false',
    'offline_customer_created',
    'writeAuditLog'
  ], 'Offline customer API');

  has(unclaimedApi, [
    'requireAdminApi',
    'unclaimed_customer_profiles_read',
    "['unclaimed', 'claim_pending']",
    'writeAuditLog'
  ], 'Unclaimed customers API');

  has(publicClaimApi, [
    'customer_account_claims',
    'claim_pending',
    'customer_claim_request_created',
    'customer_claim_request_duplicate_blocked',
    'password_created_by_admin: false',
    'No unclaimed NANOFIX customer profile was found'
  ], 'Public claim existing account API');

  has(adminClaimApi, [
    'requireAdminApi',
    'customer_account_claims_read',
    'customer_claim_request_approved',
    'customer_claim_request_rejected',
    "portal_status: 'claimed'",
    "portal_status: 'unclaimed'",
    'Rejection note is required for audit',
    'writeAuditLog'
  ], 'Admin claim review API');

  has(offlineForm, ['Offline Customer / 后台代录客户', 'id="offline-customer"', '/api/admin/customers/offline', 'Create Unclaimed Profile'], 'Offline customer form');
  has(unclaimedPanel, ['Unclaimed Customer Profiles / 未认领客户档案', '/api/admin/customers/unclaimed', 'Send Claim Link'], 'Unclaimed customer profiles panel');
  has(claimForm, ['/api/customer-portal/claim-existing-account', 'Find My Existing Records', 'Phone / 手机', 'Email / 邮箱'], 'Claim existing account form');
  has(reviewPanel, ['/api/admin/customers/account-claims', 'Claim Existing Account Review / 认领已有账号审核', 'Approve', 'Reject', 'customer_account_claims'], 'Claim review panel');
  has(customerCenter, ['AddOfflineCustomerForm', 'UnclaimedCustomerProfilesPanel', 'CustomerAccountClaimsReviewPanel'], 'Customer Center page');
  has(portalClaimPage, ['ClaimExistingAccountForm', 'Claim Existing Account', 'robots: { index: false, follow: false }'], 'Customer portal claim page');
  has(portalShell, ['Claim Existing Account', '/customer-portal/claim-existing-account'], 'Customer portal nav');
  has(nav, ['Offline Customer', 'Unclaimed Customer Profiles', 'Claim Existing Account Review', 'offline-customer', 'claim-existing-account-review'], 'Admin navigation');
  has(ready, ['customer_account_claims', 'customer_record_links'], '/api/ready table checks');

  assert(!/x-nanofix-role|x-admin-role/.test(offlineApi + unclaimedApi + adminClaimApi), 'Admin claim/offline APIs must not trust role headers.');
  assert(!/localStorage|sessionStorage/.test(offlineForm + unclaimedPanel + claimForm + reviewPanel), 'Customer offline/claim UI must not use browser storage.');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-offline-claim-existing-account', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
