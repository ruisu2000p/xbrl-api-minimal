import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase初期化（環境変数チェック付き）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase環境変数が設定されていません。モックデータを返します。');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが必要です' },
        { status: 401 }
      );
    }

    // Supabaseが設定されていない場合はモックデータを返す
    if (!supabase) {
      return NextResponse.json({
        companies: [
          {
            id: 'S100LO6W',
            name: 'トヨタ自動車株式会社',
            ticker: '7203',
            industry: '輸送用機器'
          },
          {
            id: 'S100L06R',
            name: 'ソニーグループ株式会社',
            ticker: '6758',
            industry: '電気機器'
          },
          {
            id: 'S100LCZD',
            name: '三菱UFJフィナンシャル・グループ',
            ticker: '8306',
            industry: '銀行業'
          }
        ],
        total: 3,
        page: 1,
        limit: 20
      });
    }

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const industry = searchParams.get('industry') || '';

    // APIレート制限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan')
      .eq('api_key', apiKey)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: '無効なAPIキーです' },
        { status: 401 }
      );
    }

    // レート制限チェック
    const { data: canCall } = await supabase
      .rpc('check_api_limit', { p_user_id: profile.id });

    if (!canCall) {
      return NextResponse.json(
        { error: 'APIレート制限に達しました' },
        { status: 429 }
      );
    }

    // API使用記録
    await supabase.from('api_usage').insert({
      user_id: profile.id,
      endpoint: '/api/v1/companies',
      method: 'GET',
      status_code: 200,
      response_time_ms: 0
    });

    // 企業データ取得
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data: companies, count, error } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      companies: companies || [],
      total: count || 0,
      page,
      limit
    });

  } catch (error) {
    console.error('Error in companies API:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}