# Supabase Setup Instructions

## Financial Documents テーブルの作成

各企業の複数のMarkdownファイルを個別に保存するため、新しいテーブルを作成する必要があります。

### 手順

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左側メニューから「SQL Editor」をクリック
   - 「New query」をクリック

3. **以下のSQLを実行**

```sql
-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- financial_documentsテーブルを作成
CREATE TABLE IF NOT EXISTS financial_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  doc_category VARCHAR(20) NOT NULL CHECK (doc_category IN ('public', 'audit')),
  file_name VARCHAR(255) NOT NULL,
  file_order VARCHAR(20),
  file_type VARCHAR(50),
  storage_path TEXT NOT NULL,
  content_preview TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 外部キー制約
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ユニーク制約
  UNIQUE(company_id, fiscal_year, doc_category, file_name)
);

-- インデックスを追加
CREATE INDEX idx_financial_documents_company ON financial_documents(company_id);
CREATE INDEX idx_financial_documents_year ON financial_documents(fiscal_year);
CREATE INDEX idx_financial_documents_category ON financial_documents(doc_category);
CREATE INDEX idx_financial_documents_type ON financial_documents(file_type);
CREATE INDEX idx_financial_documents_company_year ON financial_documents(company_id, fiscal_year);

-- RLSポリシーを追加
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON financial_documents
  FOR SELECT USING (true);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_documents_updated_at
  BEFORE UPDATE ON financial_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. **「Run」ボタンをクリックして実行**

5. **テーブル作成の確認**
   - 左側メニューから「Table Editor」をクリック
   - `financial_documents`テーブルが表示されることを確認

## データアップロード

テーブル作成後、以下のコマンドを実行してデータをアップロード：

### テスト実行（最初の10社）
```bash
cd C:\Users\pumpk\Downloads\xbrl-api-minimal
node scripts/upload-multiple-files.js
```

### 全データアップロード（4,231社）
```bash
# 環境変数を設定
set START_INDEX=0
set END_INDEX=4231

# アップロード実行
node scripts/upload-multiple-files.js
```

### バッチ処理で段階的にアップロード
```bash
# 最初の100社
set START_INDEX=0
set END_INDEX=100
node scripts/upload-multiple-files.js

# 次の100社
set START_INDEX=100
set END_INDEX=200
node scripts/upload-multiple-files.js

# 以降、同様に継続...
```

## トラブルシューティング

### エラー: "Could not find the table 'public.financial_documents'"
- Supabaseダッシュボードでテーブルが作成されているか確認
- SQL実行時にエラーがなかったか確認
- Table Editorでテーブルが表示されるか確認

### エラー: "violates foreign key constraint"
- companiesテーブルに該当企業が存在するか確認
- 先に企業マスタデータが登録されているか確認

### パフォーマンスが遅い場合
- BATCH_SIZEを調整（scripts/upload-multiple-files.js の39行目）
- 同時処理数を減らす（デフォルト: 5）

## 進捗確認

```bash
# アップロード状況を確認
node scripts/test-api.js
```

このスクリプトで以下を確認できます：
- アップロード済み企業数
- financial_documentsテーブルのレコード数
- サンプルデータの確認

## 注意事項

- 全4,231社の全ファイル（約10万ファイル）のアップロードには時間がかかります
- Supabaseの無料プランの場合、ストレージ容量制限に注意してください
- アップロード中はインターネット接続を維持してください