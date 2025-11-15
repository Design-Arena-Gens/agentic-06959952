import { NextResponse } from 'next/server';
import { getCurrentSnapshot } from '../../../lib/inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const snapshot = getCurrentSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
