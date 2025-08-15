import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('Test API called');
    
    // 環境変数の確認
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      return NextResponse.json({
        error: 'Environment variables not set',
        url_exists: !!url,
        key_exists: !!key
      }, { status: 500 });
    }
    
    // Supabaseクライアントの作成
    const supabase = createClient(url, key);
    
    // S100LJ4Fのファイル一覧を取得
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list('2021/S100LJ4F', { limit: 10 });
    
    if (error) {
      return NextResponse.json({
        error: 'Supabase error',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      company: 'S100LJ4F',
      files_count: files?.length || 0,
      files: files?.map(f => ({
        name: f.name,
        size: f.metadata?.size || 0
      }))
    });
    
  } catch (error: any) {
    console.error('Error in test API:', error);
    return NextResponse.json({
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
}