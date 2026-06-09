export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const CANONICAL_ROUTE = '/api/admin/backups/jobs';

function deprecated() {
  return NextResponse.json({ ok: false, error: 'This legacy backup route is retired. Use the canonical Backup Jobs API.', canonical_route: CANONICAL_ROUTE }, { status: 410 });
}

export async function GET() {
  return deprecated();
}

export async function POST() {
  return deprecated();
}
