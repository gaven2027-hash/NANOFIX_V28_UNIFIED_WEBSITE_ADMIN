import fs from "node:fs";

const migration = "supabase/migrations/20260609_v28_6_6_1_customer_center_rls_binding_security.sql";
const accountClaimsApi = "app/api/admin/customers/account-claims/route.ts";
const bindingReviewApi = "app/api/admin/customers/binding-review/route.ts";

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const sql = read(migration).toLowerCase();
const accountClaims = read(accountClaimsApi);
const bindingReview = read(bindingReviewApi);

const findings = [];

function requireText(condition, severity, area, message) {
  if (!condition) findings.push({ severity, area, message });
}

requireText(fs.existsSync(migration), "P0", "migration", "RLS repair migration is missing.");

requireText(
  sql.includes("alter table public.customer_account_claims enable row level security"),
  "P0",
  "rls",
  "customer_account_claims RLS enable statement missing."
);

requireText(
  sql.includes("alter table public.customer_record_links enable row level security"),
  "P0",
  "rls",
  "customer_record_links RLS enable statement missing."
);

requireText(
  sql.includes("create policy \"customer_account_claims_customer_own_read\""),
  "P0",
  "policy",
  "customer_account_claims customer ownership SELECT policy missing."
);

requireText(
  sql.includes("create policy \"customer_record_links_customer_own_read\""),
  "P0",
  "policy",
  "customer_record_links customer ownership SELECT policy missing."
);

requireText(
  sql.includes("to authenticated"),
  "P0",
  "policy",
  "Policies must target authenticated users, not anonymous users."
);

requireText(
  !sql.includes("to anon"),
  "P0",
  "policy",
  "Migration must not grant anon access to Customer Center security tables."
);

requireText(
  sql.includes("auth.uid() is not null"),
  "P0",
  "policy",
  "Policies must explicitly deny unauthenticated auth.uid() null access."
);

requireText(
  sql.includes("c.auth_user_id = auth.uid()") && sql.includes("c.claimed_auth_user_id = auth.uid()"),
  "P0",
  "ownership",
  "Customer ownership policy must check customers.auth_user_id and customers.claimed_auth_user_id."
);

requireText(
  sql.includes("idx_customer_account_claims_customer_id") &&
  sql.includes("idx_customer_record_links_customer_id"),
  "P1",
  "performance",
  "Customer ownership indexes should be present for RLS performance."
);

requireText(
  /requireAdminApi/.test(accountClaims),
  "P0",
  "api",
  "account-claims API must keep requireAdminApi guard."
);

requireText(
  /writeAuditLog/.test(accountClaims),
  "P0",
  "audit",
  "account-claims API must keep audit logging."
);

requireText(
  /requireAdminApi/.test(bindingReview),
  "P0",
  "api",
  "binding-review API must keep requireAdminApi guard."
);

requireText(
  /customer_record_links/.test(bindingReview) && /writeAuditLog/.test(bindingReview),
  "P0",
  "audit",
  "binding-review API must keep customer_record_links write and audit log."
);

requireText(
  !/x-customer-id|x-admin-role|x-nanofix-role/.test(accountClaims + bindingReview),
  "P0",
  "auth",
  "Customer Center repair must not trust forgeable role/customer headers."
);

requireText(
  !/select\(['"`]\*['"`]\)/.test(accountClaims + bindingReview),
  "P1",
  "data",
  "Customer Center sensitive APIs must not use select('*')."
);

const report = {
  ok: findings.filter((finding) => finding.severity === "P0").length === 0,
  verifier: "verify-v28-6-6-1-customer-center-rls-binding-security-repair",
  generated_at: new Date().toISOString(),
  branch: "v28-6-6-1-customer-center-rls-binding-security-repair",
  baseline: "v28-6-6-customer-center-real-module-audit@28dfbac",
  scope: "Migration + verifier + report only. Production Supabase SQL is not applied by this script.",
  summary: {
    findings_total: findings.length,
    p0: findings.filter((finding) => finding.severity === "P0").length,
    p1: findings.filter((finding) => finding.severity === "P1").length
  },
  repaired_tables: [
    "public.customer_account_claims",
    "public.customer_record_links"
  ],
  findings,
  next_steps: [
    "Run validate:predeploy.",
    "Run build:ci.",
    "Open Draft PR against v28-6-6-customer-center-real-module-audit.",
    "After review, apply migration only through controlled Supabase migration flow, not blind SQL repair."
  ]
};

fs.writeFileSync("V28_6_6_1_CUSTOMER_CENTER_RLS_BINDING_SECURITY_REPAIR_REPORT.json", JSON.stringify(report, null, 2));

const md = [
  "# V28.6.6.1 Customer Center RLS + Binding Security Repair Report",
  "",
  `Generated: ${report.generated_at}`,
  "",
  `OK: ${report.ok}`,
  "",
  "## Scope",
  "",
  report.scope,
  "",
  "## Repaired Tables",
  "",
  "- `public.customer_account_claims`",
  "- `public.customer_record_links`",
  "",
  "## Summary",
  "",
  `- Findings total: ${report.summary.findings_total}`,
  `- P0 findings: ${report.summary.p0}`,
  `- P1 findings: ${report.summary.p1}`,
  "",
  "## Repair Design",
  "",
  "- Enable RLS on both Customer Center security tables.",
  "- Add authenticated customer own-record SELECT policies.",
  "- Do not grant anonymous access.",
  "- Preserve Admin API writes through server-side service role.",
  "- Add RLS performance indexes on ownership/filter columns.",
  "",
  "## Findings",
  "",
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.message}`) : ["- No blocking verifier findings."]),
  "",
  "## Next Steps",
  "",
  ...report.next_steps.map((step) => `- ${step}`),
  ""
].join("\n");

fs.writeFileSync("V28_6_6_1_CUSTOMER_CENTER_RLS_BINDING_SECURITY_REPAIR_REPORT.md", md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
