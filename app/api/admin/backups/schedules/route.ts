import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, nextRunPreview, ok, validationError } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const ScheduleSchema = z.object({
  module: z.string().trim().min(1).max(80),
  frequency: z.enum(["hourly", "daily", "weekly", "monthly", "custom"]),
  exact_run_time: z.string().trim().max(20),
  timezone: z.string().trim().min(1).max(80).default("Asia/Singapore"),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  custom_cron: z.string().trim().max(120).optional(),
  retention_days: z.number().int().min(1).max(3650).default(90),
  enabled: z.boolean().default(true)
});

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:*");
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for backup schedule reads", 503);

  const { data, error } = await supabase
    .from("backup_schedules")
    .select("schedule_id,module,frequency,exact_run_time,timezone,weekdays,day_of_month,custom_cron,retention_days,enabled,next_run_at,last_run_at,updated_at")
    .order("module", { ascending: true });

  if (error) return fail("Could not read backup schedules", 500);
  return ok({
    storage: "supabase",
    schedules: data ?? [],
    recommended: "daily incremental + weekly full; staging restore verification required"
  });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, "write:settings");
  if (response) return response;

  const parsed = ScheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const next_runs = nextRunPreview(parsed.data.timezone);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for backup schedule writes", 503);
  const { error } = await supabase.from("backup_schedules").upsert({
    ...parsed.data,
    next_run_at: next_runs[0]?.run_at,
    updated_by: context?.actorId ?? null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    return fail("Backup schedule update failed", 500);
  }

  await auditLog({
    ...context,
    action: "backup_schedule.updated",
    target_table: "backup_schedules",
    target_id: parsed.data.module,
    metadata: parsed.data
  });

  return ok({
    schedule: parsed.data,
    next_runs,
    storage: "supabase"
  });
}
