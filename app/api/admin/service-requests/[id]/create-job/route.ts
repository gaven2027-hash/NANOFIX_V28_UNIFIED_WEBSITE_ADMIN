import { z } from "zod";
import { auditLog, createSupabaseAdminClient, insertIfConfigured } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const CreateJobSchema = z.object({
  assigned_engineer_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().trim().max(1000).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { context, response } = requireAdmin(request, "write:operations");
  if (response) return response;

  const parsed = CreateJobSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for job creation", 503);
  {
    const { data: existingJobs } = await supabase
      .from("jobs")
      .select("job_id,status")
      .eq("service_request_id", resolvedParams.id)
      .neq("status", "cancelled")
      .limit(1);

    if (existingJobs?.length) {
      return fail("An active job already exists for this service request", 409);
    }
  }

  const now = new Date().toISOString();
  const inserted = await insertIfConfigured("jobs", {
    service_request_id: resolvedParams.id,
    engineer_id: parsed.data.assigned_engineer_id ?? null,
    scheduled_at: parsed.data.scheduled_at ?? null,
    notes: parsed.data.notes ?? null,
    status: "assigned",
    created_at: now,
    updated_at: now
  });

  if (inserted.skipped) return fail("Supabase is not configured for job creation", 503);

  if (inserted.error) {
    return fail("Job creation failed", 500);
  }

  await supabase
    .from("service_requests")
    .update({ status: "approved", updated_at: now })
    .eq("service_request_id", resolvedParams.id);

  await auditLog({
    ...context,
    action: "service_request.create_job",
    target_table: "service_requests",
    target_id: resolvedParams.id,
    metadata: { job_id: inserted.data?.job_id ?? null }
  });

  return ok({
    job_id: inserted.data?.job_id ?? null,
    status: "assigned",
    storage: "supabase"
  });
}
