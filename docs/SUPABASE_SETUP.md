# Supabase セットアップガイド

## 1. Supabaseプロジェクト作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン
4. 新規プロジェクト作成
   - Project Name: `xbrl-api`
   - Database Password: 強力なパスワードを設定
   - Region: `Northeast Asia (Tokyo)`

## 2. データベース構造

```sql
-- 企業マスタテーブル
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  market TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 財務データテーブル
CREATE TABLE financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  fiscal_year INTEGER NOT NULL,
  markdown_content TEXT,
  financial_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_financial_reports_company_year ON financial_reports(company_id, fiscal_year);
```

## 3. Storage設定

1. Supabaseダッシュボード → Storage
2. 新規バケット作成
   - Name: `markdown-files`
   - Public: OFF（APIキー認証必須）

## 4. 環境変数設定

`.env.local`ファイルを作成：

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. データアップロードスクリプト

```javascript
// scripts/upload-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadMarkdownFiles() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  try {
    // ディレクトリ読み込み
    const companies = await fs.readdir(baseDir);
    console.log(`Found ${companies.length} companies`);
    
    // 最初の10社だけテスト
    for (const companyDir of companies.slice(0, 10)) {
      const companyPath = path.join(baseDir, companyDir);
      const stats = await fs.stat(companyPath);
      
      if (stats.isDirectory()) {
        console.log(`Processing ${companyDir}...`);
        
        // PublicDocディレクトリを探す
        const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
        
        try {
          const mdFiles = await fs.readdir(publicDocPath);
          
          for (const mdFile of mdFiles) {
            if (mdFile.endsWith('.md')) {
              const content = await fs.readFile(
                path.join(publicDocPath, mdFile), 
                'utf-8'
              );
              
              // Storageにアップロード
              const { data, error } = await supabase.storage
                .from('markdown-files')
                .upload(`${companyDir}/${mdFile}`, content, {
                  contentType: 'text/markdown',
                  upsert: true
                });
              
              if (error) {
                console.error(`Error uploading ${mdFile}:`, error);
              } else {
                console.log(`Uploaded ${mdFile}`);
                
                // データベースに記録
                await supabase.from('companies').upsert({
                  id: companyDir,
                  name: extractCompanyName(content),
                  ticker: extractTicker(companyDir)
                });
                
                await supabase.from('financial_reports').insert({
                  company_id: companyDir,
                  fiscal_year: 2022,
                  markdown_content: content.substring(0, 10000), // 最初の10000文字
                  financial_data: extractFinancialData(content)
                });
              }
            }
          }
        } catch (err) {
          console.log(`No PublicDoc for ${companyDir}`);
        }
      }
    }
    
    console.log('Upload complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// ヘルパー関数
function extractCompanyName(content) {
  const match = content.match(/^#\s+(.+?)$/m);
  return match ? match[1] : 'Unknown Company';
}

function extractTicker(dirName) {
  // ディレクトリ名から証券コードを推測
  const match = dirName.match(/\d{4}/);
  return match ? match[0] : null;
}

function extractFinancialData(content) {
  // 簡単な財務データ抽出
  const data = {};
  
  // 売上高を探す
  const revenueMatch = content.match(/売上高[^\d]*?([\d,]+)/);
  if (revenueMatch) {
    data.revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
  }
  
  return data;
}

// 実行
uploadMarkdownFiles();
```

## 6. APIの更新

```typescript
// app/api/v1/companies/[id]/route.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Supabaseから取得
  const { data: company } = await supabase
    .from('companies')
    .select(`
      *,
      financial_reports (*)
    `)
    .eq('id', params.id)
    .single();
  
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  // Storageからフルコンテンツ取得
  const { data: fileData } = await supabase.storage
    .from('markdown-files')
    .download(`${params.id}/main.md`);
  
  if (fileData) {
    const content = await fileData.text();
    company.full_content = content;
  }
  
  return NextResponse.json(company);
}
```

## 7. 実行コマンド

```bash
# 依存関係インストール
npm install @supabase/supabase-js

# アップロードスクリプト実行
node scripts/upload-to-supabase.js
```

## 8. 料金見積もり

### 無料プラン（開始時）
- ストレージ: 500MB（約500社分）
- 帯域幅: 2GB/月
- API呼び出し: 無制限
- **月額: ¥0**

### Proプラン（必要時）
- ストレージ: 8GB（全4,231社）
- 帯域幅: 250GB/月
- バックアップ: 7日間
- **月額: $25（約¥3,750）**

## トラブルシューティング

### CORS エラー
Supabaseダッシュボード → Authentication → URL Configuration で許可するURLを追加

### レート制限
Service Role Keyを使用（制限なし）

### ストレージ容量
不要なファイルを圧縮またはテキスト抽出のみ保存