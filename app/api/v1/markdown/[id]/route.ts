/**
 * Markdown本文取得API
 * GET /api/v1/markdown/[id]
 * Claude Desktop MCP用
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { 
  authByApiKey, 
  checkRateLimit, 
  recordApiUsage, 
  getClientIp 
} from '@/app/api/_lib/authByApiKey';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const startTime = Date.now();
  
  try {
    // APIキー認証
    const auth = await authByApiKey(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // レート制限チェック
    const rateLimitOk = await checkRateLimit(
      auth.key.id,
      parseInt(process.env.API_RATE_LIMIT_PER_MIN || '60')
    );
    
    if (!rateLimitOk) {
      await recordApiUsage(
        auth.key.id,
        auth.userId,
        `/api/v1/markdown/${params.id}`,
        'GET',
        429,
        Date.now() - startTime,
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    // ドキュメント情報を取得
    const { data: doc, error: docError } = await admin
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (docError || !doc) {
      await recordApiUsage(
        auth.key.id,
        auth.userId,
        `/api/v1/markdown/${params.id}`,
        'GET',
        404,
        Date.now() - startTime,
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Storageからファイルを取得
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'markdown-files';
    const { data: file, error: storageError } = await admin.storage
      .from(bucketName)
      .download(doc.storage_key);

    if (storageError || !file) {
      console.error('Storage error:', storageError);
      
      await recordApiUsage(
        auth.key.id,
        auth.userId,
        `/api/v1/markdown/${params.id}`,
        'GET',
        500,
        Date.now() - startTime,
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve document content' },
        { status: 500 }
      );
    }

    // ファイル内容をテキストとして読み取り
    const markdown = await file.text();

    // 成功時のログ記録
    const responseTime = Date.now() - startTime;
    await recordApiUsage(
      auth.key.id,
      auth.userId,
      `/api/v1/markdown/${params.id}`,
      'GET',
      200,
      responseTime,
      getClientIp(req),
      req.headers.get('user-agent') || undefined
    );

    // レスポンス
    return NextResponse.json({
      metadata: {
        id: doc.id,
        path: doc.path,
        title: doc.title,
        companyCode: doc.company_code,
        companyName: doc.company_name,
        fiscalYear: doc.fiscal_year,
        docType: doc.doc_type,
        fileSize: doc.file_size,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
      content: markdown,
      contentLength: markdown.length,
      responseTimeMs: responseTime,
    });
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/v1/markdown/[id]
 * CORS対応
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}