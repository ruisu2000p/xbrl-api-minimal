// Force Node.js runtime for DNS operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, canDomainReceiveMailCached } from '@/utils/email-validation';
import { checkRateLimit } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  try {
    // レート制限: IPアドレスごとに5回/5分
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(`email-validation:${clientIp}`, 5, 300000)) {
      console.warn('⚠️ Rate limit exceeded for email validation:', { ip: clientIp });
      return NextResponse.json(
        { valid: false, error: 'リクエストが多すぎます。しばらくしてから再度お試しください。' },
        { status: 429 }
      );
    }

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
