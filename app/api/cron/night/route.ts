import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Stateless design: clients compute snapshot based on time.
  return NextResponse.json({ ok: true, scheduled: '20:00 UTC', at: new Date().toISOString() });
}
