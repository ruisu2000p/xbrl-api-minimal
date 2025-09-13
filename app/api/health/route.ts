// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'xbrl-api-minimal'
  });
}