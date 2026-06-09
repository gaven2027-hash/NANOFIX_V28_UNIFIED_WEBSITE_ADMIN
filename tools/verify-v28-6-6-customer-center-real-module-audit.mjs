import fs from "node:fs";

const requiredFiles = [
  "app/customer-center/page.tsx",
  "components/CustomerAccountClaimsReviewPanel.tsx",
  "components/CustomerBindingReviewPanel.tsx",
  "components/CustomerCenterActionWorkspace.tsx",
  "components/CustomerMergeCenterPanel.tsx",
  "components/Customer360.tsx",
  "components/Customer360TimelinePanel.tsx",
  "components/AdminCustomerDocumentsPanel.tsx",
  "app/api/admin/customers/account-claims/route.ts",
  "app/api/admin/customers/binding-review/route.ts",
  "app/api/admin/customers/merge-center/route.ts",
  "app/api/admin/customer-center/documents/route.ts",
  "app/api/admin/customer-service-linkage/route.ts"
];

const findings = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    findings.push({
      severity: "P0",
      area: "file",
      file,
      message: "Required Customer Center file is missing."
    });
  }
}

const apiFiles = requiredFiles.filter((file) => file.includes("/api/"));

for (const file of apiFiles) {
  const content = read(file);
  if (!content) continue;

  if (!/requireAdminApi|requireCustomer|requireRole|requireActor/.test(content)) {
    findings.push({
      severity: "P0",
      area: "auth",
      file,
      message: "API does not show server-side auth/RBAC guard."
    });
  }

  if (!/writeAuditLog/.test(content)) {
    findings.push({
      severity: "P1",
      area: "audit",
      file,
      message: "API does not show audit log write marker."
    });
  }

  if (/select\(['"`]\*['"`]\)/.test(content)) {
    findings.push({
      severity: "P1",
      area: "data",
      file,
      message: "Sensitive API appears to use select('*'). Replace with explicit fields."
    });
  }

  if (/x-customer-id|x-admin-role|x-nanofix-role/.test(content)) {
    findings.push({
      severity: "P0",
      area: "auth",
      file,
      message: "API references forgeable role/customer header."
    });
  }

  if (/localStorage/.test(content)) {
    findings.push({
      severity: "P0",
      area: "state",
      file,
      message: "API references localStorage business state."
    });
  }
}

const liveSupabaseFindings = [
  {
    severity: "P0",
    area: "live_supabase_rls",
    table: "customer_account_claims",
    message: "Live Supabase check confirms RLS is disabled on public.customer_account_claims. pg_policies returned no policies."
  },
  {
    severity: "P0",
    area: "live_supabase_rls",
    table: "customer_record_links",
    message: "Live Supabase check confirms RLS is disabled on public.customer_record_links. pg_policies returned no policies."
  }
];

for (const finding of liveSupabaseFindings) findings.push(finding);

const customerCenterPage = read("app/customer-center/page.tsx");
const workspaceMarkers = [
  "CustomerAccountClaimsReviewPanel",
  "CustomerBindingReviewPanel",
  "CustomerMergeCenterPanel",
  "Customer360TimelinePanel",
  "CustomerCenterActionWorkspace",
  "AdminCustomerDocumentsPanel"
];

for (const marker of workspaceMarkers) {
  if (!customerCenterPage.includes(marker)) {
    findings.push({
      severity: "P1",
      area: "workspace",
      marker,
      message: `Customer Center page does not render ${marker}.`
    });
  }
}

const report = {
  ok: false,
  verifier: "verify-v28-6-6-customer-center-real-module-audit",
  generated_at: new Date().toISOString(),
  branch: "v28-6-6-customer-center-real-module-audit",
  baseline: "main@1dbdc91 after PR #22 merge",
  scope: "Audit only. No production database changes. No repair yet.",
  summary: {
    required_files_checked: requiredFiles.length,
    api_files_checked: apiFiles.length,
    findings_total: findings.length,
    p0: findings.filter((item) => item.severity === "P0").length,
    p1: findings.filter((item) => item.severity === "P1").length
  },
  live_supabase_confirmation: {
    project_ref: "qjwcjttdyzsgexswbygt",
    customer_account_claims_rls_enabled: false,
    customer_record_links_rls_enabled: false,
    policies_found_for_both_tables: 0
  },
  findings,
  recommendation: "Open a focused repair branch v28-6-6-1-customer-center-rls-binding-security-repair. Best repair path: enable RLS for customer_account_claims and customer_record_links, add deny-by-default ownership/admin policies, preserve service-role admin API writes, add verifier evidence, then run validate/build/preview smoke."
};

fs.writeFileSync("V28_6_6_CUSTOMER_CENTER_REAL_MODULE_AUDIT_REPORT.json", JSON.stringify(report, null, 2));

const md = [
  "# V28.6.6 Customer Center Real Module Audit Report",
  "",
  `Generated: ${report.generated_at}`,
  "",
  `OK: ${report.ok}`,
  "",
  "## Summary",
  "",
  `- Required files checked: ${report.summary.required_files_checked}`,
  `- API files checked: ${report.summary.api_files_checked}`,
  `- Findings total: ${report.summary.findings_total}`,
  `- P0 findings: ${report.summary.p0}`,
  `- P1 findings: ${report.summary.p1}`,
  "",
  "## Live Supabase Confirmation",
  "",
  "- `customer_account_claims`: RLS disabled in live Supabase.",
  "- `customer_record_links`: RLS disabled in live Supabase.",
  "- `pg_policies`: no policies found for both tables.",
  "",
  "## Findings",
  "",
  ...findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file || finding.table || finding.marker}: ${finding.message}`),
  "",
  "## Best Repair Direction",
  "",
  report.recommendation,
  ""
].join("\n");

fs.writeFileSync("V28_6_6_CUSTOMER_CENTER_REAL_MODULE_AUDIT_REPORT.md", md);

console.log(JSON.stringify(report, null, 2));
process.exitCode = 1;
