import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";
import { searchFilters } from "@/lib/nanofix/spec";

export const dynamic = "force-dynamic";

const searchableTables = ["customers", "leads", "service_requests", "social_messages"];

const searchColumns: Record<string, string[]> = {
  customers: ["name", "phone", "email", "whatsapp"],
  leads: ["name", "phone", "email", "source_platform", "status"],
  service_requests: ["contact_name", "phone", "email", "issue_description", "issue_type", "address_text", "status"],
  social_messages: ["channel", "source_platform", "message_text", "sender_contact", "status"]
};

const selectColumns: Record<string, string> = {
  customers: "customer_id,name,phone,email,whatsapp,binding_status,status,created_at",
  leads: "lead_id,name,phone,email,source_platform,priority,status,binding_status,created_at",
  service_requests:
    "service_request_id,lead_id,customer_id,contact_name,phone,email,issue_type,address_text,priority,status,binding_status,created_at",
  social_messages: "message_id,source_platform,channel,sender_contact,message_text,priority,status,created_at"
};

function cleanSearch(input: string) {
  return input.replace(/[\\%_(),.*:;{}[\]"'<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(request: Request) {
  const { context, response } = requireAdmin(request, "read:*");
  if (response) return response;

  const url = new URL(request.url);
  const q = cleanSearch(url.searchParams.get("q") || "");
  const requestedFilters = url.searchParams.getAll("filter");
  const filters = requestedFilters.length
    ? requestedFilters.filter((filter) => searchFilters.includes(filter) && searchableTables.includes(filter))
    : searchableTables;

  if (!q) return ok({ groups: [], total: 0, filters });

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return fail("Supabase is not configured. Admin search must query the unified database.", 503);
  }

  const groups = [];
  for (const table of searchableTables.filter((table) => filters.includes(table))) {
    const pattern = `%${q}%`;
    const orQuery = searchColumns[table].map((column) => `${column}.ilike.${pattern}`).join(",");
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns[table])
      .or(orQuery)
      .limit(8);

    if (!error) groups.push({ module: table, results: data ?? [] });
  }

  const total = groups.reduce((sum, group) => sum + group.results.length, 0);
  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: "search.executed",
    target_table: "search_logs",
    metadata: { q, filters, total }
  });

  return ok({ source: "supabase", groups, total, filters });
}

export async function POST() {
  return fail("Use GET for search. Use a dedicated export endpoint for audited exports.", 405);
}
