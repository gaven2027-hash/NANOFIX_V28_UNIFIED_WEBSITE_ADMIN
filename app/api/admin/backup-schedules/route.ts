export const dynamic = "force-dynamic";

import { GET as canonicalGET, PATCH as canonicalPATCH } from "@/app/api/admin/backups/schedules/route";
import { requireAdmin } from "@/lib/nanofix/auth";

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:*");
  if (response) return response;
  return canonicalGET(request);
}

export async function PATCH(request: Request) {
  const { response } = requireAdmin(request, "write:settings");
  if (response) return response;
  return canonicalPATCH(request);
}

export const POST = PATCH;
