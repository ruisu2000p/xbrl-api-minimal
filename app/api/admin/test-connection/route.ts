import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // 環境変数の詳細確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // 1. Supabase接続テスト
    const connectionTest = {
      supabaseUrl: supabaseUrl ? '✅ 設定済み' : '❌ 未設定',
      serviceRoleKey: serviceRoleKey ? '✅ 設定済み' : '❌ 未設定',
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined',
      keyLength: serviceRoleKey ? serviceRoleKey.length : 0,
      keyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 20) + '...' : 'undefined'
    };

    // Supabaseクライアント作成（エラーハンドリング付き）
    let supabase;
    let clientError = null;
    
    try {
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing environment variables');
      }
      
      supabase = createClient(supabaseUrl, serviceRoleKey);
    } catch (err) {
      clientError = err instanceof Error ? err.message : 'Unknown error';
    }
    
    if (!supabase) {
      return NextResponse.json({
        status: 'error',
        connection: connectionTest,
        error: 'Failed to create Supabase client',
        details: clientError
      }, { status: 500 });
    }

    // 2. usersテーブルの存在確認
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .limit(5);

    // 3. 管理者ユーザーの確認
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('role', 'admin');

    // 4. 特定の管理者アカウント確認
    const { data: specificAdmin, error: specificError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@xbrl-api.com')
      .single();

    return NextResponse.json({
      status: 'success',
      connection: connectionTest,
      tables: {
        users: {
          exists: !usersError,
          error: usersError?.message,
          recordCount: users?.length || 0,
          sampleRecords: users
        }
      },
      adminUsers: {
        count: adminUsers?.length || 0,
        users: adminUsers,
        error: adminError?.message
      },
      targetAdmin: {
        found: !!specificAdmin,
        data: specificAdmin,
        error: specificError?.message
      },
      debugInfo: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}