import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { auditActor, requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type BackupTableSpec = {
  table: string;
  moduleTags: string[];
  preferredColumns: string[];
};

const BACKUP_BUCKET = process.env.NANOFIX_BACKUP_BUCKET || "system-backups";
const BACKUP_SIGNED_URL_TTL_SECONDS = Number(process.env.NANOFIX_BACKUP_SIGNED_URL_TTL_SECONDS || 900);
const SENSITIVE_COLUMN_PATTERN = /(password|secret|token|api[_-]?key|service[_-]?role|private[_-]?key|credential|session|otp|hash|salt)/i;

const BACKUP_TABLE_MANIFEST: BackupTableSpec[] = [
  { table: "customers", moduleTags: ["central_database", "customers", "customer"], preferredColumns: ["customer_id", "profile_id", "name", "phone", "email", "account_status", "binding_status", "created_at", "updated_at"] },
  { table: "unified_intake", moduleTags: ["central_database", "intake", "service_requests"], preferredColumns: ["intake_id", "source_platform", "source_type", "source_medium", "source_form", "customer_name", "phone", "email", "postal_code", "address_text", "issue_type", "message", "binding_status", "priority", "urgency_score", "created_at"] },
  { table: "leads", moduleTags: ["central_database", "leads", "service_requests"], preferredColumns: ["lead_id", "intake_id", "name", "phone", "email", "address_text", "issue_type", "message", "source_platform", "request_origin", "binding_status", "priority", "urgency_score", "status", "created_at"] },
  { table: "service_requests", moduleTags: ["central_database", "service_requests"], preferredColumns: ["service_request_id", "intake_id", "lead_id", "customer_id", "contact_name", "phone", "whatsapp", "email", "address_text", "postal_code", "issue_type", "leak_location", "issue_description", "status", "binding_status", "priority", "request_origin", "created_at", "updated_at"] },
  { table: "service_inspections", moduleTags: ["central_database", "inspections", "service_requests"], preferredColumns: ["inspection_id", "service_request_id", "job_id", "customer_id", "status", "scheduled_at", "created_at", "updated_at"] },
  { table: "service_upload_reviews", moduleTags: ["central_database", "uploads", "service_requests"], preferredColumns: ["upload_review_id", "service_request_id", "job_id", "inspection_id", "file_name", "file_type", "storage_path", "review_status", "visible_to_customer", "created_at"] },
  { table: "quotations", moduleTags: ["central_database", "quotations", "finance"], preferredColumns: ["quotation_id", "job_id", "service_request_id", "customer_id", "current_version", "total", "total_amount", "approval_status", "status", "visible_to_customer", "pdf_storage_path", "public_ref", "created_at", "updated_at"] },
  { table: "quotation_versions", moduleTags: ["central_database", "quotations", "finance"], preferredColumns: ["version_id", "quotation_id", "version_no", "total", "status", "created_at"] },
  { table: "quotation_acceptances", moduleTags: ["central_database", "quotations", "finance"], preferredColumns: ["acceptance_id", "quotation_id", "customer_id", "accepted_at", "status", "created_at"] },
  { table: "quotation_customer_responses", moduleTags: ["central_database", "quotations", "finance"], preferredColumns: ["response_id", "quotation_id", "quotation_version", "customer_id", "response_type", "response_status", "quoted_total", "customer_message", "created_at"] },
  { table: "quotation_pdf_documents", moduleTags: ["central_database", "quotations", "documents"], preferredColumns: ["quotation_pdf_id", "quotation_id", "storage_path", "file_name", "generation_status", "visible_to_customer", "created_at"] },
  { table: "jobs", moduleTags: ["central_database", "jobs", "service_requests"], preferredColumns: ["job_id", "service_request_id", "customer_id", "status", "scheduled_at", "repair_completed_at", "created_at", "updated_at"] },
  { table: "invoices", moduleTags: ["central_database", "invoices", "finance"], preferredColumns: ["invoice_id", "invoice_no", "job_id", "customer_id", "quotation_id", "total", "total_amount", "currency", "status", "visible_to_customer", "pdf_storage_path", "public_ref", "created_at", "updated_at"] },
  { table: "invoice_pdf_documents", moduleTags: ["central_database", "invoices", "documents"], preferredColumns: ["invoice_pdf_id", "invoice_id", "storage_path", "file_name", "generation_status", "visible_to_customer", "created_at"] },
  { table: "payments", moduleTags: ["central_database", "payments", "finance"], preferredColumns: ["payment_id", "invoice_id", "customer_id", "amount", "currency", "status", "reconciled_at", "created_at"] },
  { table: "warranties", moduleTags: ["central_database", "warranties"], preferredColumns: ["warranty_id", "warranty_no", "job_id", "customer_id", "quotation_id", "invoice_id", "status", "coverage", "warranty_years", "warranty_terms", "starts_at", "ends_at", "visible_to_customer", "created_at", "updated_at"] },
  { table: "warranty_pdf_documents", moduleTags: ["central_database", "warranties", "documents"], preferredColumns: ["warranty_pdf_id", "warranty_id", "customer_id", "job_id", "storage_path", "file_name", "generation_status", "visible_to_customer", "created_at"] },
  { table: "warranty_claims", moduleTags: ["central_database", "warranties"], preferredColumns: ["claim_id", "warranty_id", "customer_id", "status", "issue_summary", "created_at", "updated_at"] },
  { table: "customer_portal_requests", moduleTags: ["central_database", "customer_portal", "customers"], preferredColumns: ["request_id", "customer_id", "request_type", "status", "created_at", "updated_at"] },
  { table: "customer_document_feedback", moduleTags: ["central_database", "customer_portal", "documents"], preferredColumns: ["feedback_id", "customer_id", "document_type", "document_id", "rating", "message", "created_at"] },
  { table: "unified_tasks", moduleTags: ["central_database", "tasks", "operations"], preferredColumns: ["task_id", "source_module", "source_table", "source_id", "title", "priority", "assignee_role", "status", "created_at", "updated_at"] },
  { table: "task_events", moduleTags: ["central_database", "tasks", "operations"], preferredColumns: ["event_id", "task_id", "action", "created_at"] },
  { table: "workflow_settings", moduleTags: ["central_database", "settings", "workflow"], preferredColumns: ["setting_id", "module", "setting_key", "setting_value", "enabled", "updated_at"] },
  { table: "status_transition_logs", moduleTags: ["central_database", "audit", "operations"], preferredColumns: ["transition_id", "machine", "object_id", "from_status", "to_status", "reason", "actor_role", "created_at"] },
  { table: "audit_logs", moduleTags: ["central_database", "audit"], preferredColumns: ["audit_id", "actor_id", "actor_role", "action", "target_table", "target_id", "created_at"] },
  { table: "backup_jobs", moduleTags: ["central_database", "backup", "settings"], preferredColumns: ["backup_id", "module", "schedule_cron", "encrypted_file_path", "signed_url_expires_at", "status", "created_by", "created_at"] },
  { table: "backup_schedules", moduleTags: ["central_database", "backup", "settings"], preferredColumns: ["module", "frequency", "exact_run_time", "timezone", "retention_days", "enabled", "next_run_at", "last_run_at", "updated_at"] },
  { table: "content_drafts", moduleTags: ["central_database", "website", "content"], preferredColumns: ["draft_id", "title", "status", "content_type", "created_by", "created_at", "updated_at"] },
  { table: "ai_logs", moduleTags: ["central_database", "ai"], preferredColumns: ["log_id", "module", "action", "status", "created_at"] },
  { table: "app_modules", moduleTags: ["central_database", "settings", "modules"], preferredColumns: ["module_key", "name", "status", "health_status", "updated_at"] },
  { table: "automation_rules", moduleTags: ["central_database", "automation", "settings"], preferredColumns: ["rule_id", "name", "module", "enabled", "created_at", "updated_at"] },
  { table: "notification_outbox", moduleTags: ["central_database", "notifications", "operations"], preferredColumns: ["notification_id", "channel", "recipient_customer_id", "subject", "delivery_status", "related_object_type", "related_object_id", "created_at"] },
  { table: "internal_inbox_messages", moduleTags: ["central_database", "inbox", "operations"], preferredColumns: ["message_id", "recipient_role", "subject", "category", "priority", "related_object_type", "related_object_id", "created_at"] }
];

const BackupJobSchema = z.object({
  module: z.string().trim().min(1).max(80).default("central_database"),
  schedule_cron: z.string().trim().max(120).optional(),
  manual_reason: z.string().trim().max(300).optional(),
  mode: z.enum(["queue", "run_now", "restore_dry_run", "create_signed_url"]).default("run_now"),
  backup_id: z.string().uuid().optional()
});

function encryptionKey() {
  const raw = process.env.NANOFIX_BACKUP_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) throw new Error("NANOFIX_BACKUP_ENCRYPTION_KEY is required for encrypted backup execution.");
  return createHash("sha256").update(raw).digest();
}

function encryptJson(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("NANOFIX-BACKUP-V1\n"), iv, tag, encrypted]);
}

function selectedSpecsForModule(module: string) {
  if (module === "central_database") return BACKUP_TABLE_MANIFEST;
  const normalized = module.toLowerCase();
  const selected = BACKUP_TABLE_MANIFEST.filter((spec) => spec.table.includes(normalized) || spec.moduleTags.includes(normalized));
  return selected.length ? selected : BACKUP_TABLE_MANIFEST;
}

function safeColumn(column: string) {
  return !SENSITIVE_COLUMN_PATTERN.test(column);
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, SENSITIVE_COLUMN_PATTERN.test(key) ? "[REDACTED]" : redactValue(inner)]));
}

function redactRows(rows: unknown[] | null) {
  return (rows ?? []).map((row) => redactValue(row) as Record<string, unknown>);
}

async function resolveExportColumns(supabase: SupabaseAdminClient, spec: BackupTableSpec) {
  const fallbackColumns = spec.preferredColumns.filter(safeColumn);
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", spec.table);

  if (error || !Array.isArray(data)) {
    return { columns: fallbackColumns, warning: error?.message ?? null };
  }

  const existing = new Set(data.map((row) => String(row.column_name)).filter(Boolean));
  const preferredExisting = fallbackColumns.filter((column) => existing.has(column));
  const columns = preferredExisting.length ? preferredExisting : [...existing].filter(safeColumn).slice(0, 80);
  return { columns, warning: null };
}

async function ensureBucket(supabase: SupabaseAdminClient) {
  const { error } = await supabase.storage.createBucket(BACKUP_BUCKET, {
    public: false,
    fileSizeLimit: "250MB"
  });
  if (error && !/already exists|Duplicate/i.test(error.message)) {
    throw new Error(error.message);
  }
}

async function collectBackupData(supabase: SupabaseAdminClient, module: string) {
  const selectedSpecs = selectedSpecsForModule(module);
  const data: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  const redaction_manifest: Record<string, { exported_columns: string[]; redacted_column_pattern: string; warning?: string | null }> = {};

  for (const spec of selectedSpecs) {
    const resolved = await resolveExportColumns(supabase, spec);
    redaction_manifest[spec.table] = {
      exported_columns: resolved.columns,
      redacted_column_pattern: SENSITIVE_COLUMN_PATTERN.source,
      warning: resolved.warning
    };
    if (!resolved.columns.length) {
      errors[spec.table] = resolved.warning || "No export-safe columns resolved.";
      continue;
    }
    const { data: rows, error } = await supabase.from(spec.table).select(resolved.columns.join(",")).limit(1000);
    if (error) errors[spec.table] = error.message;
    else data[spec.table] = redactRows(rows as unknown[] | null);
  }

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      module,
      format: "encrypted-json",
      schema_version: "v28-6-8-1-backup-redaction-manifest",
      table_count: selectedSpecs.length,
      incomplete_tables: Object.keys(errors),
      redaction_manifest
    },
    data,
    errors
  };
}

async function runEncryptedBackup(supabase: SupabaseAdminClient, jobId: string, module: string) {
  await ensureBucket(supabase);
  await supabase.from("backup_jobs").update({ status: "running" }).eq("backup_id", jobId);
  const payload = await collectBackupData(supabase, module);
  const encrypted = encryptJson(payload);
  const objectPath = `${module}/${new Date().toISOString().replace(/[:.]/g, "-")}-${jobId}.nanofix.enc`;
  const upload = await supabase.storage.from(BACKUP_BUCKET).upload(objectPath, encrypted, {
    contentType: "application/octet-stream",
    upsert: false,
    cacheControl: "no-store"
  });
  if (upload.error) throw new Error(upload.error.message);

  await supabase
    .from("backup_jobs")
    .update({
      status: "completed",
      encrypted_file_path: objectPath,
      signed_url_expires_at: null
    })
    .eq("backup_id", jobId);

  return {
    encrypted_file_path: objectPath,
    download_requires_approval: true,
    signed_url: null,
    signed_url_expires_at: null,
    manifest: payload.metadata
  };
}

async function createSignedDownloadLink(supabase: SupabaseAdminClient, backupId: string, context: Parameters<typeof auditActor>[0]) {
  const { data: job, error } = await supabase
    .from("backup_jobs")
    .select("backup_id,module,status,encrypted_file_path,created_at")
    .eq("backup_id", backupId)
    .maybeSingle();
  if (error || !job?.encrypted_file_path) throw new Error(error?.message || "Backup file path not found");
  if (job.status !== "completed") throw new Error("Only completed backup jobs can create signed download links.");

  const expiresIn = BACKUP_SIGNED_URL_TTL_SECONDS;
  const signed = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(job.encrypted_file_path, expiresIn);
  if (signed.error) throw new Error(signed.error.message);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await supabase
    .from("backup_jobs")
    .update({ signed_url_expires_at: expiresAt })
    .eq("backup_id", backupId);

  const result = {
    backup_id: backupId,
    module: job.module,
    encrypted_file_path: job.encrypted_file_path,
    signed_url: signed.data?.signedUrl ?? null,
    signed_url_expires_at: expiresAt,
    ttl_seconds: expiresIn,
    download_audited: true
  };

  await auditLog({
    ...auditActor(context),
    action: "backup.signed_download_link_created",
    target_table: "backup_jobs",
    target_id: backupId,
    metadata: { ...result, signed_url: "[REDACTED_SIGNED_URL]" }
  });

  return result;
}

async function runRestoreDryRun(supabase: SupabaseAdminClient, backupId: string) {
  const { data: job, error } = await supabase
    .from("backup_jobs")
    .select("backup_id,module,status,encrypted_file_path,created_at")
    .eq("backup_id", backupId)
    .maybeSingle();
  if (error || !job?.encrypted_file_path) throw new Error(error?.message || "Backup file path not found");
  const download = await supabase.storage.from(BACKUP_BUCKET).download(job.encrypted_file_path);
  if (download.error) throw new Error(download.error.message);
  const bytes = Buffer.from(await download.data.arrayBuffer());
  const validHeader = bytes.subarray(0, "NANOFIX-BACKUP-V1\n".length).toString("utf8") === "NANOFIX-BACKUP-V1\n";
  return {
    backup_id: backupId,
    module: job.module,
    encrypted_file_path: job.encrypted_file_path,
    restore_dry_run: validHeader ? "passed" : "failed",
    encrypted_bytes: bytes.length,
    note: "Dry run validates encrypted backup format and storage readability only; it does not overwrite production data."
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:*");
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return ok({ backups: [], storage: "not_configured" });
  }

  const { data, error } = await supabase
    .from("backup_jobs")
    .select("backup_id,module,schedule_cron,status,encrypted_file_path,signed_url_expires_at,created_by,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return fail("Backup jobs query failed", 500, error.message);
  return ok({ backups: data ?? [], storage: "supabase", download_flow: "signed links are generated only after an audited create_signed_url request" });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:settings");
  if (response) return response;

  const parsed = BackupJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for backup jobs", 503);

  if (parsed.data.mode === "create_signed_url") {
    if (!parsed.data.backup_id) return fail("backup_id is required for create_signed_url", 400);
    try {
      const execution = await createSignedDownloadLink(supabase, parsed.data.backup_id, context);
      return ok({ storage: "supabase_storage", mode: "create_signed_url", execution });
    } catch (error) {
      return fail("Signed backup download link creation failed", 500, error instanceof Error ? error.message : "unknown");
    }
  }

  if (parsed.data.mode === "restore_dry_run") {
    if (!parsed.data.backup_id) return fail("backup_id is required for restore_dry_run", 400);
    try {
      const result = await runRestoreDryRun(supabase, parsed.data.backup_id);
      await auditLog({
        ...auditActor(context),
        action: "backup.restore_dry_run",
        target_table: "backup_jobs",
        target_id: parsed.data.backup_id,
        metadata: result
      });
      return ok({ storage: "supabase_storage", ...result });
    } catch (error) {
      return fail("Backup restore dry run failed", 500, error instanceof Error ? error.message : "unknown");
    }
  }

  const job = {
    module: parsed.data.module,
    schedule_cron: parsed.data.schedule_cron ?? (parsed.data.mode === "queue" ? "manual_queue" : "manual_run_now"),
    status: parsed.data.mode === "queue" ? "scheduled" : "running",
    created_by: context?.actorId === "env-token-admin" ? null : context?.actorId ?? null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("backup_jobs").insert(job).select("backup_id").single();
  if (error) return fail("Backup job queue failed", 500, error.message);

  let execution: Record<string, unknown> | null = null;
  if (parsed.data.mode === "run_now") {
    try {
      execution = await runEncryptedBackup(supabase, data.backup_id, parsed.data.module);
    } catch (error) {
      await supabase.from("backup_jobs").update({ status: "failed" }).eq("backup_id", data.backup_id);
      return fail("Encrypted backup execution failed", 500, error instanceof Error ? error.message : "unknown");
    }
  }

  await auditLog({
    ...auditActor(context),
    action: parsed.data.mode === "run_now" ? "backup.encrypted_completed" : "backup.job_queued",
    target_table: "backup_jobs",
    target_id: data?.backup_id ?? null,
    metadata: { ...job, manual_reason: parsed.data.manual_reason ?? null, execution }
  });

  return ok({ backup_id: data?.backup_id ?? null, storage: "supabase_storage", mode: parsed.data.mode, execution });
}
