// 環境変数チェック用エンドポイント（デバッグ用）
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // セキュリティ: 本番環境では無効化
  const isProduction = process.env.NODE_ENV === 'production';
  const debugKey = request.nextUrl.searchParams.get('debug');
  
  // 本番環境では特定のデバッグキーが必要
  if (isProduction && debugKey !== 'xbrl2025debug') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 環境変数の状態を確認（値は隠す）
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'Not set',
      isCorrectProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('wpwqxhyiglbtlaimrjrx') || false
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      type: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('anon') ? 'Looks like anon key' : 'Unknown',
      prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'Not set'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      type: process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('service_role') ? 'Looks like service key' : 
            process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('anon') ? 'WARNING: This is anon key, not service key!' : 'Unknown',
      prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'Not set'
    },
    KEY_PEPPER: {
      exists: !!process.env.KEY_PEPPER,
      length: process.env.KEY_PEPPER?.length || 0
    }
  };

  // Supabase接続テスト
  let supabaseTest = {
    canCreateClient: false,
    testError: null as string | null
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const testClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
      
      // 簡単なテストクエリ
      const { error } = await testClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      
      if (error) {
        supabaseTest.testError = error.message;
      } else {
        supabaseTest.canCreateClient = true;
      }
    } else {
      supabaseTest.testError = 'Missing required environment variables';
    }
  } catch (error: any) {
    supabaseTest.testError = error.message || 'Unknown error';
  }

  // 診断結果
  const diagnosis = {
    status: 'checking',
    issues: [] as string[],
    recommendations: [] as string[]
  };

  // 問題の診断
  if (!envStatus.NEXT_PUBLIC_SUPABASE_URL.exists) {
    diagnosis.issues.push('NEXT_PUBLIC_SUPABASE_URL is not set');
    diagnosis.recommendations.push('Set NEXT_PUBLIC_SUPABASE_URL in Vercel Environment Variables');
  }

  if (!envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY.exists) {
    diagnosis.issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    diagnosis.recommendations.push('Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables');
  }

  if (!envStatus.SUPABASE_SERVICE_ROLE_KEY.exists) {
    diagnosis.issues.push('SUPABASE_SERVICE_ROLE_KEY is not set (CRITICAL)');
    diagnosis.recommendations.push('Set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables');
  } else if (envStatus.SUPABASE_SERVICE_ROLE_KEY.type.includes('WARNING')) {
    diagnosis.issues.push('SUPABASE_SERVICE_ROLE_KEY seems to be anon key, not service role key');
    diagnosis.recommendations.push('Get the correct service_role key from Supabase Dashboard > Settings > API');
  }

  if (!envStatus.NEXT_PUBLIC_SUPABASE_URL.isCorrectProject) {
    diagnosis.issues.push('Supabase URL does not match expected project (wpwqxhyiglbtlaimrjrx)');
    diagnosis.recommendations.push('Verify you are using the correct Supabase project URL');
  }

  diagnosis.status = diagnosis.issues.length === 0 ? 'OK' : 'ISSUES_FOUND';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envStatus,
    supabaseTest,
    diagnosis,
    helpUrl: 'https://github.com/ruisu2000p/xbrl-api-minimal/blob/main/VERCEL_ENV_SETUP.md'
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}