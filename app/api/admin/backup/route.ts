export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/nanofix/auth';

const CANONICAL_ROUTE = '/api/admin/backups/jobs';

function deprecated() {
  return NextResponse.json({ ok: false, error: 'This legacy backup route is retired. Use the canonical Backup Jobs API.', canonical_route: CANONICAL_ROUTE }, { status: 410 });
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:*');
  if (response) return response;
  return deprecated();
}

export async function POST(request: Request) {
  const { response } = requireAdmin(request, 'write:settings');
  if (response) return response;
  return deprecated();
}
