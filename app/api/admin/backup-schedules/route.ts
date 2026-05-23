import { z } from "zod";
import { ok, fail, readJsonOrForm, validationError } from "@/lib/nanofix/api";
import { requirePermission } from "@/lib/nanofix/rbac";
import { createSupabaseAdminClient, auditLog } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BackupScheduleSchema = z.object({
  module: z.string().trim().min(2).max(80),
  frequency: z.enum(["hourly", "daily", "weekly", "monthly", "custom"]),
  exact_run_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(3).max(80).default("Asia/Singapore"),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  custom_cron: z.string().trim().max(120).optional().or(z.literal("")),
  retention_days: z.coerce.number().int().min(7).max(3650).default(90),
  enabled: z.coerce.boolean().default(true)
});

export async function GET(request: Request) {
  const permission = requirePermission(request, "module_health.read");
  if (permission.denied) return permission.denied;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for backup schedule reads", 503);

  const { data, error } = await supabase
    .from("backup_schedules")
    .select("schedule_id,module,frequency,exact_run_time,timezone,weekdays,day_of_month,custom_cron,retention_days,enabled,next_run_at,last_run_at,updated_at")
    .order("module", { ascending: true });

  if (error) return fail("Could not read backup schedules", 500);
  return ok({ storage: "supabase", schedules: data ?? [] });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "*");
  if (permission.denied) return permission.denied;

  const payload = await readJsonOrForm(request);
  const parsed = BackupScheduleSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for backup schedule writes", 503);

  const record = { ...parsed.data, updated_by: permission.role, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("backup_schedules")
    .upsert(record, { onConflict: "module" })
    .select("schedule_id,module,frequency,exact_run_time,timezone,weekdays,day_of_month,custom_cron,retention_days,enabled,next_run_at,last_run_at,updated_at")
    .single();

  if (error) return fail("Backup schedule update failed", 500);

  await auditLog({
    actor_role: permission.role,
    action: "backup_schedule.updated",
    target_table: "backup_schedules",
    target_id: parsed.data.module,
    metadata: record
  });

  return ok({ storage: "supabase", schedule: data });
}
