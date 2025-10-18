// Force Node.js runtime for DNS operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, canDomainReceiveMailCached } from '@/utils/email-validation';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // 包括的なメール検証
    const result = await validateEmail(email);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'メールアドレスの検証中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
