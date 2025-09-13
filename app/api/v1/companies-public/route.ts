// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数（wpwqxhyiglbtlaimrjrxプロジェクトを使用）
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/companies-public - 企業一覧取得（公開版）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');
    const search = searchParams.get('search') || '';
    const sector = searchParams.get('sector') || '';

    // Supabaseクライアント作成（直接作成）
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // companiesテーブルから取得
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    // 検索条件追加
    if (search) {
      query = query.or(`name.ilike.%${search}%,ticker_code.ilike.%${search}%`);
    }

    if (sector) {
      query = query.eq('sector', sector);
    }

    // ページネーション
    const offset = (page - 1) * per_page;
    query = query
      .range(offset, offset + per_page - 1)
      .order('name', { ascending: true });

    // データ取得
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          hint: error.hint || '',
          details: error.details || ''
        },
        { status: 500 }
      );
    }

    // レスポンス作成
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      },
      status: 200
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}