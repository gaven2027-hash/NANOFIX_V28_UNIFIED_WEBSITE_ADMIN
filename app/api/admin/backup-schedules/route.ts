export const dynamic = "force-dynamic";

import { GET as canonicalGET, PATCH as canonicalPATCH } from "@/app/api/admin/backups/schedules/route";

export const GET = canonicalGET;
export const PATCH = canonicalPATCH;
export const POST = canonicalPATCH;
