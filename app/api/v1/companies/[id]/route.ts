// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// デモ用のサンプルデータ（実際はデータベースやファイルから取得）
const sampleCompanyData = {
  '7203': {
    name: 'トヨタ自動車株式会社',
    ticker: '7203',
    sector: '輸送用機器',
    fiscal_year: '2022',
    markdown: `# トヨタ自動車株式会社
## 有価証券報告書（2022年3月期）

### 【企業の概況】
#### 主要な経営指標等の推移

| 決算年月 | 2018年3月 | 2019年3月 | 2020年3月 | 2021年3月 | 2022年3月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（百万円） | 29,379,510 | 30,225,681 | 29,929,992 | 27,214,594 | 31,379,507 |
| 営業利益（百万円） | 2,399,862 | 2,467,545 | 2,442,869 | 2,197,748 | 2,995,697 |
| 当期純利益（百万円） | 2,493,983 | 1,882,873 | 2,076,183 | 2,245,261 | 2,850,110 |
| 純資産額（百万円） | 19,922,076 | 20,565,210 | 20,618,888 | 23,404,547 | 26,245,969 |
| ROE（％） | 13.7 | 9.6 | 10.1 | 10.2 | 11.5 |

### 【事業の内容】
当社グループは、自動車事業を中心に、金融事業及びその他の事業を行っています。
自動車事業では、セダン、ミニバン、2BOX、スポーツユーティリティビークル、トラック等の自動車とその関連部品・用品の設計、製造および販売を行っています。

### 【事業等のリスク】
1. 業界・経営環境
2. 商品・サービス
3. コンプライアンス・リーガルリスク
4. 財務・経理
5. 情報システム・情報セキュリティ`,
    financial_data: {
      revenue: 31379507000000,
      operating_income: 2995697000000,
      net_income: 2850110000000,
      total_assets: 67688771000000,
      shareholders_equity: 26245969000000,
      roe: 11.5,
      employees: 372817
    }
  },
  '6758': {
    name: 'ソニーグループ株式会社',
    ticker: '6758',
    sector: '電気機器',
    fiscal_year: '2022',
    markdown: `# ソニーグループ株式会社
## 有価証券報告書（2022年3月期）

### 【企業の概況】
#### 主要な経営指標等の推移

| 決算年月 | 2018年3月 | 2019年3月 | 2020年3月 | 2021年3月 | 2022年3月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（百万円） | 8,665,687 | 8,794,994 | 8,259,885 | 8,998,783 | 9,921,513 |
| 営業利益（百万円） | 894,230 | 845,459 | 548,059 | 971,851 | 1,202,343 |
| 当期純利益（百万円） | 733,529 | 916,271 | 582,191 | 1,171,776 | 882,178 |

### 【事業の内容】
当社グループは、ゲーム＆ネットワークサービス、音楽、映画、エンタテインメント・テクノロジー＆サービス、
イメージング＆センシング・ソリューション、金融及びその他の事業を営んでいます。`,
    financial_data: {
      revenue: 9921513000000,
      operating_income: 1202343000000,
      net_income: 882178000000
    }
  }
};

// APIキーの検証（簡易版）
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  // 実際の実装では、データベースでAPIキーを確認
  return apiKey.startsWith('xbrl_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const companyId = params.id;
    const companyData = sampleCompanyData[companyId as keyof typeof sampleCompanyData];

    if (!companyData) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // レスポンスヘッダーを設定
    return NextResponse.json(companyData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}