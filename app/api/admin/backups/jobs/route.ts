import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { auditActor, requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const BACKUP_BUCKET = process.env.NANOFIX_BACKUP_BUCKET || "system-backups";
const BACKUP_TABLES = [
  "customers",
  "unified_intake",
  "leads",
  "service_requests",
  "inspections",
  "quotations",
  "jobs",
  "invoices",
  "payments",
  "receipts",
  "warranties",
  "website_pages",
  "website_content_blocks",
  "ai_drafts",
  "social_messages",
  "module_health_events",
  "audit_logs"
] as const;

const BackupJobSchema = z.object({
  module: z.string().trim().min(1).max(80).default("central_database"),
  schedule_cron: z.string().trim().max(120).optional(),
  manual_reason: z.string().trim().max(300).optional(),
  mode: z.enum(["queue", "run_now", "restore_dry_run"]).default("run_now"),
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
  const tables = module === "central_database" ? BACKUP_TABLES : BACKUP_TABLES.filter((table) => table.includes(module));
  const selectedTables = tables.length ? tables : BACKUP_TABLES;
  const data: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};

  for (const table of selectedTables) {
    const { data: rows, error } = await supabase.from(table).select().limit(1000);
    if (error) errors[table] = error.message;
    else data[table] = rows ?? [];
  }

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      module,
      format: "encrypted-json",
      schema_version: "v28-production-hardening",
      table_count: selectedTables.length,
      incomplete_tables: Object.keys(errors)
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

  const expiresIn = Number(process.env.NANOFIX_BACKUP_SIGNED_URL_TTL_SECONDS || 900);
  const signed = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(objectPath, expiresIn);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await supabase
    .from("backup_jobs")
    .update({
      status: "completed",
      encrypted_file_path: objectPath,
      signed_url_expires_at: expiresAt
    })
    .eq("backup_id", jobId);

  return {
    encrypted_file_path: objectPath,
    signed_url: signed.data?.signedUrl ?? null,
    signed_url_expires_at: expiresAt,
    manifest: payload.metadata
  };
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
  return ok({ backups: data ?? [], storage: "supabase" });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:settings");
  if (response) return response;

  const parsed = BackupJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for backup jobs", 503);

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
