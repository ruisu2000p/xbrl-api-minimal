// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// APIキーの検証（簡易版）
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  // 実際の実装では、データベースでAPIキーを確認
  return apiKey.startsWith('xbrl_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const companyId = params.id;
    
    // TODO: Implement actual database lookup
    return NextResponse.json(
      { error: 'Company data not available. Please implement database connection.' },
      { status: 501 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}