// ==========================================
// XBRL Gateway - Secure Version with RPC
// ==========================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-api-key, X-API-Key, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function json(status: number, body: unknown, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function maskKey(k?: string | null) {
  if (!k) return '';
  return k.length <= 8 ? '***' : `${k.slice(0, 4)}...${k.slice(-4)}`;
}

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// JWT検証をオフ（独自APIキー認証を使用）
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const url = new URL(req.url);

    // 環境変数
    const env: Env = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    };

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: 'Gateway misconfigured' });
    }

    // APIキー取得（Authorization / x-api-key / apikey / ?api_key）
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    const xApiKeyHdr = req.headers.get('x-api-key') ?? req.headers.get('X-API-Key') ?? req.headers.get('apikey');
    const xApiKeyQry = url.searchParams.get('api_key');
    let apiKey: string | null = null;

    if (authHeader) {
      const tryBearer = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (tryBearer.startsWith('xbrl_v1_')) apiKey = tryBearer;
    }
    if (!apiKey && xApiKeyHdr?.startsWith('xbrl_v1_')) apiKey = xApiKeyHdr.trim();
    if (!apiKey && xApiKeyQry?.startsWith('xbrl_v1_')) apiKey = xApiKeyQry.trim();

    const mask = (k?: string | null) => !k ? '' : (k.length <= 10 ? '***' : `${k.slice(0, 4)}...${k.slice(-4)}`);
    console.log('[Gateway] Request:', {
      method: req.method,
      path: url.pathname,
      hasApiKey: !!apiKey,
      apiKeyMasked: mask(apiKey),
      headers: {
        authHeader: !!authHeader,
        xApiKeyHdr: !!xApiKeyHdr,
        xApiKeyQry: !!xApiKeyQry
      }
    });

    if (!apiKey) {
      return json(401, {
        error: 'APIキーが必要です',
        help: 'Authorization: Bearer <api_key> または x-api-key ヘッダー、または ?api_key= パラメータで指定してください'
      });
    }

    // SRKクライアント作成（セッション永続化なし）
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // ルーティング - Path normalize (both local and prod: with or without /functions/v1)
    const fnBase = 'xbrl-gateway';
    const segs = url.pathname.split('/').filter(Boolean); // e.g. ["functions","v1","xbrl-gateway","markdown-files"]
    const idx = segs.findIndex(s => s === fnBase);
    const endpoint = idx >= 0 ? segs.slice(idx + 1).join('/') : url.pathname.replace(/^\//, '');

    console.log('[Gateway] Debug:', {
      pathname: url.pathname,
      segs,
      endpoint,
      method: req.method,
      search: url.search
    });

    // ヘルスチェック
    if (!endpoint || endpoint === '') {
      return json(200, {
        success: true,
        message: 'XBRL Gateway Service (Secure)',
        version: '2.0.0',
        endpoints: [
          '/xbrl-gateway/markdown-files',
          '/xbrl-gateway/markdown-files/signed-url',
          '/xbrl-gateway/markdown-files/toc',
          '/xbrl-gateway/markdown-files/chunk'
        ]
      });
    }

    // ==========================================
    // /markdown-files: 検索（RPC一択）
    // ==========================================
    if (endpoint === 'markdown-files' || endpoint.startsWith('markdown-files?')) {
      // GET or POST both supported for search
      // 入力検証
      const rawLimit = Number(url.searchParams.get('limit') ?? '10');
      const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : 10, 1, 50);

      const offsetRaw = Number(url.searchParams.get('offset') ?? '0');
      const offset = clamp(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0, 100000);

      const fiscalYear = url.searchParams.get('fiscal_year');
      const companyId = url.searchParams.get('company_id');
      const search = (url.searchParams.get('search') ||
                     url.searchParams.get('company_name') ||
                     url.searchParams.get('english_name') || '').trim();

      if (search.length > 64) {
        return json(400, { error: 'query too long (max 64 chars)' });
      }
      if (fiscalYear && fiscalYear.length > 16) {
        return json(400, { error: 'fiscal_year too long (max 16 chars)' });
      }
      if (companyId && companyId.length > 64) {
        return json(400, { error: 'company_id too long (max 64 chars)' });
      }

      console.log('[Gateway] Search params:', {
        search: search || null,
        fiscalYear: fiscalYear || null,
        companyId: companyId || null,
        limit,
        offset
      });

      // RPC呼び出し（直クエリは完全排除）
      console.log('[Gateway] Calling RPC with:', {
        p_key: apiKey ? `${apiKey.slice(0, 10)}...` : 'null',
        p_q: search || null,
        p_fiscal_year: fiscalYear || null,
        p_company_id: companyId || null,
        p_limit: limit,
        p_offset: offset
      });

      const { data, error } = await admin.rpc('search_markdowns_secure', {
        p_key: apiKey,
        p_q: search || null,
        p_fiscal_year: fiscalYear || null,
        p_company_id: companyId || null,
        p_limit: limit,
        p_offset: offset
      });

      console.log('[Gateway] RPC response:', {
        success: !error,
        dataLength: data?.length ?? 0,
        error: error ? error.message : null
      });

      if (error) {
        console.error('[Gateway] RPC failed:', error);
        return json(500, {
          error: 'Database query failed',
          message: 'Unable to search markdown files',
          details: error.message
        });
      }

      return json(200, {
        success: true,
        count: data?.length ?? 0,
        results: data ?? [],
        page: { limit, offset },
        filters: {
          fiscal_year: fiscalYear ?? null,
          company_id: companyId ?? null,
          search: search || null
        },
        message: data?.length ? `Found ${data.length} documents. Use storage_path to read content.` : 'No documents found for the search criteria.',
        debug: {
          endpoint,
          pathname: url.pathname,
          segs,
          searchParams: {
            search,
            fiscalYear,
            companyId,
            limit,
            offset
          },
          apiKeyProvided: !!apiKey,
          apiKeyMasked: mask(apiKey)
        }
      });
    }

    // ==========================================
    // /markdown-files/toc: 見出し目次取得
    // ==========================================
    if (endpoint === 'markdown-files/toc' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const storagePath = (body?.storage_path ?? '').toString().trim();

      if (!storagePath || storagePath.length > 512) {
        return json(400, { error: 'invalid storage_path (max 512 chars)' });
      }

      console.log('[Gateway] TOC request:', { storagePath });

      // storage_pathから'markdown-files/'プレフィックスを除去（DBに既に含まれている）
      const cleanPath = storagePath.replace(/^markdown-files\//, '');

      // ストレージから本文ダウンロード
      const { data: blob, error: dlErr } = await admin
        .storage.from('markdown-files')
        .download(cleanPath);

      if (dlErr || !blob) {
        console.error('[Gateway] Download failed:', dlErr);
        return json(404, {
          error: 'File not found',
          details: dlErr?.message
        });
      }

      const text = await blob.text();

      // 見出し抽出（h1～h4）
      const headingRegex = /^(#{1,4})\s+(.+)$/gm;
      const toc: { level: number; title: string; offset: number }[] = [];
      let match;

      while ((match = headingRegex.exec(text)) !== null) {
        toc.push({
          level: match[1].length,
          title: match[2].trim(),
          offset: match.index
        });
      }

      return json(200, {
        success: true,
        storage_path: storagePath,
        total_size: text.length,
        sections: toc,
        message: `Found ${toc.length} headings. Use /chunk with offset to read specific sections.`
      });
    }

    // ==========================================
    // /markdown-files/chunk: 分割取得（ページング）
    // ==========================================
    if (endpoint === 'markdown-files/chunk' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const storagePath = (body?.storage_path ?? '').toString().trim();
      const offset = clamp(Number(body?.offset ?? 0), 0, 100_000_000);
      const length = clamp(Number(body?.length ?? 20000), 1000, 30000);

      if (!storagePath || storagePath.length > 512) {
        return json(400, { error: 'invalid storage_path (max 512 chars)' });
      }

      console.log('[Gateway] Chunk request:', {
        storagePath,
        offset,
        length
      });

      // storage_pathから'markdown-files/'プレフィックスを除去（DBに既に含まれている）
      const cleanPath = storagePath.replace(/^markdown-files\//, '');

      // ストレージから本文ダウンロード
      const { data: blob, error: dlErr } = await admin
        .storage.from('markdown-files')
        .download(cleanPath);

      if (dlErr || !blob) {
        console.error('[Gateway] Download failed:', dlErr);
        return json(404, {
          error: 'File not found',
          details: dlErr?.message
        });
      }

      const text = await blob.text();
      const chunk = text.slice(offset, offset + length);
      const nextOffset = offset + chunk.length;
      const hasMore = nextOffset < text.length;

      return json(200, {
        success: true,
        storage_path: storagePath,
        chunk: {
          text: chunk,
          offset,
          length: chunk.length,
          next_offset: hasMore ? nextOffset : null,
          has_more: hasMore
        },
        file_info: {
          total_size: text.length,
          progress: `${nextOffset}/${text.length} (${Math.round(nextOffset / text.length * 100)}%)`
        }
      });
    }

    // ==========================================
    // /markdown-files/signed-url: ストレージ署名URL
    // ==========================================
    if (endpoint === 'markdown-files/signed-url' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const storagePath = (body?.storage_path ?? '').toString().trim();
      const expires = clamp(Number(body?.expires ?? 60), 10, 600); // 10〜600秒

      if (!storagePath || storagePath.length > 512) {
        return json(400, { error: 'invalid storage_path (max 512 chars)' });
      }

      console.log('[Gateway] Signed URL request:', {
        storagePath,
        expires
      });

      // 署名URL発行（SRK内部）
      const { data: signed, error: sErr } = await admin
        .storage.from('markdown-files')
        .createSignedUrl(storagePath, expires);

      if (sErr) {
        console.error('[Gateway] Signed URL failed:', sErr);
        return json(500, {
          error: 'Failed to create signed URL',
          details: sErr.message
        });
      }

      return json(200, {
        success: true,
        url: signed?.signedUrl,
        expires_in: expires
      });
    }

    return json(404, {
      error: 'Endpoint not found',
      availableEndpoints: [
        '/xbrl-gateway/markdown-files',
        '/xbrl-gateway/markdown-files/toc',
        '/xbrl-gateway/markdown-files/chunk',
        '/xbrl-gateway/markdown-files/signed-url'
      ],
      receivedPath: url.pathname
    });

  } catch (e) {
    console.error('[Gateway] Fatal error:', e);
    return json(500, {
      error: 'Internal server error',
      message: e?.message ?? String(e)
    });
  }
});