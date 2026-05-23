import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { auditActor, requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const WarrantySchema = z.object({
  job_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  coverage: z.string().trim().min(3).max(2000),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:operations");
  if (response) return response;
  const parsed = WarrantySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for warranty issuance", 503);

  const { data: job } = await supabase.from("jobs").select("job_id,status").eq("job_id", parsed.data.job_id).maybeSingle();
  if (!job || job.status !== "completed") return fail("Warranty can only be issued for a completed job", 409);

  const { data, error } = await supabase
    .from("warranties")
    .insert({ ...parsed.data, status: "active", created_at: new Date().toISOString() })
    .select("warranty_id,job_id,customer_id,status,starts_on,ends_on")
    .single();
  if (error) return fail("Warranty issuance failed", 500, error.message);

  await auditLog({
    ...auditActor(context),
    action: "warranty.issued",
    target_table: "warranties",
    target_id: data?.warranty_id ?? null,
    metadata: data
  });
  return ok({ storage: "supabase", warranty: data });
}
