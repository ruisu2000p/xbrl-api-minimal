// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアントの初期化（Anon keyを使用してテスト）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// APIキーの検証
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('xbrl_');
}

// モックファイルコンテンツ（Storage接続問題の回避用）
const mockFileContents: Record<string, string> = {
  'S100NS9Y/PublicDoc/0000000_header': `# 【表紙】

【提出書類】 |  有価証券報告書
---|---
【根拠条文】 |  金融商品取引法第24条第１項
【提出先】 |  関東財務局長
【提出日】 |  2022年３月30日
【事業年度】 |  第１期（自 2021年10月１日 至 2021年12月31日）
【会社名】 |  フルサト・マルカホールディングス株式会社
【英訳名】 |  MARUKA FURUSATO Corporation
【代表者の役職氏名】 |  代表取締役社長 古里 龍平
【本店の所在の場所】 |  大阪市中央区南新町一丁目２番10号
【電話番号】 |  （０６）６９４６－１６００(代表)
【事務連絡者氏名】 |  執行役員 管理本部 本部長 藤井 武嗣
【最寄りの連絡場所】 |  大阪市中央区南新町一丁目２番10号
【電話番号】 |  （０６）６９４６－１６００(代表)
【事務連絡者氏名】 |  執行役員 管理本部 本部長 藤井 武嗣
【縦覧に供する場所】 |  株式会社東京証券取引所 （東京都中央区日本橋兜町２番１号）

## 企業概要

本資料は、金融商品取引法に基づく有価証券報告書です。フルサト・マルカホールディングス株式会社の第１期（2021年10月1日〜2021年12月31日）の業績と財務状況について報告しています。`,

  'S100L3K4/PublicDoc_markdown/0101010_honbun': `# 第一部【企業情報】

## 第１【企業の概況】

### １【主要な経営指標等の推移】

当社は、エクステリア・ガーデニング用品の企画・製造・販売を主力事業として展開しております。当社グループは、当社及び連結子会社２社により構成されており、エクステリア・ガーデニング用品の企画・製造・販売事業を営んでおります。

#### 連結経営指標等

| 決算年月 | 2017年１月 | 2018年１月 | 2019年１月 | 2020年１月 | 2021年１月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（千円） | 7,244,588 | 7,899,652 | 8,156,983 | 8,440,125 | 8,789,456 |
| 経常利益（千円） | 356,789 | 423,567 | 456,123 | 489,678 | 523,234 |
| 当期純利益（千円） | 234,567 | 278,345 | 301,234 | 325,678 | 348,901 |
| 包括利益（千円） | 245,678 | 289,456 | 312,345 | 336,789 | 360,123 |
| 純資産額（千円） | 2,345,678 | 2,634,123 | 2,946,456 | 3,283,234 | 3,632,135 |
| 総資産額（千円） | 4,567,890 | 5,024,679 | 5,571,236 | 6,128,459 | 6,756,595 |

### ２【沿革】

当社は、昭和58年に設立され、以来エクステリア・ガーデニング業界のリーディングカンパニーとして成長してまいりました。

### ３【事業の内容】

当社グループの事業は、エクステリア・ガーデニング用品事業の単一セグメントであります。主な商品は以下のとおりです：

- **フェンス・門扉**: アルミ製、スチール製の各種フェンスと門扉
- **ガーデンファニチャー**: テーブル、チェア、パラソル等の庭園用家具  
- **植栽資材**: 植木鉢、プランター、土壌改良材等
- **照明器具**: ガーデンライト、ソーラーライト等の屋外照明

### ４【関係会社の状況】

| 会社名 | 住所 | 資本金 | 主要な事業の内容 | 議決権の所有割合 |
|--------|------|--------|----------------|----------------|
| タカショー白山株式会社 | 石川県白山市 | 30,000千円 | エクステリア用品製造 | 100.0% |
| タカショーデジテック株式会社 | 京都府京都市 | 50,000千円 | システム開発・保守 | 100.0% |`,

  'S100LJ4F/PublicDoc_markdown/0102010_honbun': `## 第２【事業の状況】

### １【経営方針、経営環境及び対処すべき課題等】

#### (1) 会社の経営の基本方針

当社グループは、「美味しさ、楽しさ、健康を」をモットーに、米菓を中心とした菓子事業を展開し、お客様に喜ばれる商品作りに努めております。

創業以来培ってきた米菓製造技術を活かし、安全・安心で美味しい商品を提供し続けることで、社会に貢献してまいります。

#### (2) 目標とする経営指標

当社グループは、持続的な成長と企業価値の向上を目指し、以下の経営指標を重視しております：

- **売上高成長率**: 年率3-5%の安定成長
- **営業利益率**: 7%以上の維持
- **ROE（自己資本利益率）**: 8%以上
- **自己資本比率**: 60%以上の健全性維持

#### (3) 中長期的な会社の経営戦略

##### ア. 国内市場戦略

- **主力商品の強化**: 「亀田の柿の種」「ハッピーターン」等の主力ブランドの更なる強化
- **新商品開発**: 健康志向・高付加価値商品の開発
- **チャネル拡大**: EC販売の強化、新業態店舗への展開

##### イ. 海外市場戦略  

- **アジア市場**: 東南アジア、中国市場への展開加速
- **欧米市場**: 健康志向の高い米菓の認知度向上
- **現地生産**: 主要市場での生産体制構築

### ２【事業等のリスク】

当社グループの事業展開において、投資者の判断に重要な影響を及ぼす可能性があると考えられる主要なリスクは以下のとおりです。

#### (1) 原材料価格の変動リスク

| 主要原材料 | リスク内容 | 対応策 |
|----------|----------|-------|
| 米 | 作柄による価格変動 | 複数産地からの調達、先物取引活用 |
| 植物油 | 原油価格連動 | 調達先多様化、価格動向監視 |
| 包装資材 | 石油製品価格連動 | 代替材料の検討、効率的使用 |

#### (2) 食品安全リスク

食品製造業として、原材料から製品までの一貫した品質管理体制を構築し、HACCP、ISO22000等の国際基準に準拠した管理を実施しております。

#### (3) 自然災害等のリスク

製造拠点の分散、BCPの策定により、事業継続性の確保に努めております。

### ３【経営者による財政状態、経営成績及びキャッシュ・フローの状況の分析】

#### (1) 経営成績等の状況の概要

##### ア. 経営成績の状況

当連結会計年度の売上高は103,305百万円（前年同期比0.5%減）となりました。

| 項目 | 当期（百万円） | 前期（百万円） | 増減率 |
|------|-------------|-------------|-------|
| 売上高 | 103,305 | 103,808 | △0.5% |
| 営業利益 | 6,889 | 6,909 | △0.3% |
| 経常利益 | 6,889 | 6,909 | △0.3% |
| 当期純利益 | 4,757 | 4,463 | +6.6% |`
};

// GET: Markdownファイル検索とメタデータ取得（Anon key使用）
export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const companyName = searchParams.get('company_name');
    const fiscalYear = searchParams.get('fiscal_year');
    const documentType = searchParams.get('document_type');
    const sectionType = searchParams.get('section_type');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // クエリ構築（Anon keyで実行）
    let query = supabase
      .from('markdown_files_metadata')
      .select(`
        id,
        company_id,
        company_name,
        file_name,
        file_path,
        storage_path,
        fiscal_year,
        document_type,
        section_type,
        file_order,
        file_size,
        content_preview,
        has_tables,
        has_images,
        indexed_at,
        access_count
      `);

    // フィルタリング
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`);
    }
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }
    
    if (documentType) {
      query = query.eq('document_type', documentType);
    }
    
    if (sectionType) {
      query = query.eq('section_type', sectionType);
    }
    
    // フルテキスト検索
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,content_preview.ilike.%${search}%`);
    }

    // 並び順とリミット
    query = query
      .order('company_id')
      .order('fiscal_year', { ascending: false })
      .order('file_order')
      .range(offset, offset + limit - 1);

    // データ取得
    const { data: files, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // レスポンス
    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0,
      message: 'Mock API using anon key - working!',
      filters: {
        company_id: companyId,
        company_name: companyName,
        fiscal_year: fiscalYear,
        document_type: documentType,
        section_type: sectionType,
        search: search,
        limit: limit,
        offset: offset
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// POST: モックファイルコンテンツを返す
export async function POST(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { file_path, storage_path } = body;

    if (!file_path && !storage_path) {
      return NextResponse.json(
        { error: 'file_path or storage_path is required' },
        { status: 400 }
      );
    }

    // メタデータをデータベースから取得
    const { data: metadata, error: metaError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq(file_path ? 'file_path' : 'storage_path', file_path || storage_path)
      .single();

    if (metaError || !metadata) {
      return NextResponse.json(
        { error: 'File metadata not found', details: metaError?.message },
        { status: 404 }
      );
    }

    // モックコンテンツを取得
    const pathKey = metadata.file_path.replace(/\/[^\/]+\.md$/, '');
    const mockContent = mockFileContents[pathKey] || `# ${metadata.file_name}

## ファイル情報

- **企業**: ${metadata.company_name}
- **年度**: ${metadata.fiscal_year}年
- **種類**: ${metadata.document_type}
- **セクション**: ${metadata.section_type}

## 内容プレビュー

${metadata.content_preview}

---

*これはモックコンテンツです。実際のStorage接続が確立されると、完全なMarkdownファイルが表示されます。*`;

    // アクセス数を更新
    await supabase
      .from('markdown_files_metadata')
      .update({ 
        access_count: (metadata.access_count || 0) + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('id', metadata.id);

    return NextResponse.json({
      success: true,
      metadata: {
        id: metadata.id,
        company_id: metadata.company_id,
        company_name: metadata.company_name,
        file_name: metadata.file_name,
        fiscal_year: metadata.fiscal_year,
        document_type: metadata.document_type,
        section_type: metadata.section_type,
        file_size: metadata.file_size,
        has_tables: metadata.has_tables,
        has_images: metadata.has_images
      },
      content: mockContent,
      stats: {
        access_count: (metadata.access_count || 0) + 1,
        content_length: mockContent.length,
        preview_length: metadata.content_preview?.length || 0
      },
      note: 'This is mock content. Real Storage integration coming soon.'
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}