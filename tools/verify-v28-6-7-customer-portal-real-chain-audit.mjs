import fs from "node:fs";

const requiredFiles = [
  "app/customer-portal/page.tsx",
  "components/CustomerPortalDashboard.tsx",
  "components/CustomerPortalRequestWorkspace.tsx",
  "components/PortalDataLoop.tsx",
  "components/Customer360.tsx",
  "app/api/customer-portal/records/route.ts",
  "app/api/customer-portal/service-requests/route.ts",
  "app/api/customer-portal/quotations/respond/route.ts",
  "app/api/customer-portal/warranties/route.ts",
  "app/api/customer-portal/uploads/route.ts",
  "app/api/customer-portal/activity-timeline/route.ts"
];

const apiFiles = requiredFiles.filter((file) => file.includes("/api/"));
const findings = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function add(severity, area, file, message) {
  findings.push({ severity, area, file, message });
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) add("P0", "file", file, "Required Customer Portal chain file is missing.");
}

for (const file of apiFiles) {
  const content = read(file);
  if (!content) continue;

  if (!/requireActorApi|requireCustomer|requireRole|requireActor/.test(content)) {
    add("P0", "auth", file, "API does not show server-side actor/customer auth guard.");
  }

  if (/x-customer-id|x-admin-role|x-nanofix-role/.test(content)) {
    add("P0", "auth", file, "API references forgeable customer/admin role header.");
  }

  if (/localStorage/.test(content)) {
    add("P0", "state", file, "API references localStorage business state.");
  }

  if (/select\(['"`]\*['"`]\)/.test(content)) {
    add("P1", "data", file, "Sensitive API appears to use select('*').");
  }

  if (!/writeAuditLog/.test(content)) {
    add("P1", "audit", file, "API does not show audit log marker.");
  }
}

const records = read("app/api/customer-portal/records/route.ts");
if (!/profile_id/.test(records) || !/customer_id/.test(records)) {
  add("P0", "ownership", "app/api/customer-portal/records/route.ts", "Records API must resolve records through customer profile/customer_id ownership.");
}
if (!/visible_to_customer/.test(records)) {
  add("P1", "visibility", "app/api/customer-portal/records/route.ts", "Records API should enforce visible_to_customer for customer financial/warranty documents.");
}

const serviceRequests = read("app/api/customer-portal/service-requests/route.ts");
for (const marker of ["unified_intake", "leads", "service_requests", "unified_tasks", "internal_inbox_messages", "notification_outbox"]) {
  if (!serviceRequests.includes(marker)) {
    add("P0", "write_chain", "app/api/customer-portal/service-requests/route.ts", `Customer portal service request chain is missing ${marker}.`);
  }
}
if (!/normalizeServiceAttachmentUrls/.test(serviceRequests)) {
  add("P1", "storage", "app/api/customer-portal/service-requests/route.ts", "Attachment URL normalization/security marker missing.");
}

const quotationRespond = read("app/api/customer-portal/quotations/respond/route.ts");
for (const marker of ["visible_to_customer", "quotation_customer_responses", "status_transition_logs", "writeAuditLog"]) {
  if (!quotationRespond.includes(marker)) {
    add("P0", "quotation_response", "app/api/customer-portal/quotations/respond/route.ts", `Quotation response chain missing ${marker}.`);
  }
}
if (!/resolveQuotationOwner|customerIdsForProfile/.test(quotationRespond)) {
  add("P0", "ownership", "app/api/customer-portal/quotations/respond/route.ts", "Quotation response must verify quotation ownership.");
}

const uploads = read("app/api/customer-portal/uploads/route.ts");
for (const marker of ["review_status", "approved", "visible_to_customer", "createSignedUrl", "belongsToAllowed"]) {
  if (!uploads.includes(marker)) {
    add("P0", "uploads", "app/api/customer-portal/uploads/route.ts", `Uploads API missing ${marker}.`);
  }
}

const warranties = read("app/api/customer-portal/warranties/route.ts");
if (warranties && !/customer_id|profile_id/.test(warranties)) {
  add("P0", "warranty", "app/api/customer-portal/warranties/route.ts", "Warranty API must filter by customer ownership.");
}

const timeline = read("app/api/customer-portal/activity-timeline/route.ts");
if (timeline && !/customer_id|profile_id/.test(timeline)) {
  add("P0", "timeline", "app/api/customer-portal/activity-timeline/route.ts", "Activity timeline API must filter by customer ownership.");
}

const page = read("app/customer-portal/page.tsx");
for (const marker of ["CustomerPortalDashboard", "CustomerPortalDataLoop", "CustomerPortalRequestWorkspace", "Customer360"]) {
  if (!page.includes(marker)) add("P1", "page", "app/customer-portal/page.tsx", `Customer Portal page does not render ${marker}.`);
}

const report = {
  ok: findings.filter((finding) => finding.severity === "P0").length === 0,
  verifier: "verify-v28-6-7-customer-portal-real-chain-audit",
  generated_at: new Date().toISOString(),
  branch: "v28-6-7-customer-portal-real-chain-audit",
  baseline: "main@bf455ff",
  scope: "Audit only. No repair code and no production database changes.",
  summary: {
    required_files_checked: requiredFiles.length,
    api_files_checked: apiFiles.length,
    findings_total: findings.length,
    p0: findings.filter((finding) => finding.severity === "P0").length,
    p1: findings.filter((finding) => finding.severity === "P1").length
  },
  findings,
  recommendation: findings.some((finding) => finding.severity === "P0")
    ? "Open a focused V28.6.7.1 repair branch for Customer Portal ownership/auth/storage/visibility gaps."
    : "Customer Portal real chain has no blocking structural finding. Proceed with preview/customer-session smoke and Supabase live RLS/advisor confirmation."
};

fs.writeFileSync("V28_6_7_CUSTOMER_PORTAL_REAL_CHAIN_AUDIT_REPORT.json", JSON.stringify(report, null, 2));

const md = [
  "# V28.6.7 Customer Portal Real Chain Audit Report",
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
  "## Findings",
  "",
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message}`) : ["- No blocking structural findings detected."]),
  "",
  "## Recommendation",
  "",
  report.recommendation,
  ""
].join("\n");

fs.writeFileSync("V28_6_7_CUSTOMER_PORTAL_REAL_CHAIN_AUDIT_REPORT.md", md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
