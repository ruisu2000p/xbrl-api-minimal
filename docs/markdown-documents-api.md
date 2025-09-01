# Markdown Documents API

## 概要
`markdown_files_metadata`テーブルを参照し、企業の有価証券報告書Markdownファイルを検索・取得するAPIエンドポイント。

## エンドポイント
```
GET  /api/v1/markdown-documents
POST /api/v1/markdown-documents
```

## 機能

### GET - ドキュメント検索
メタデータを検索し、オプションでStorageからコンテンツを取得。

#### パラメータ
| パラメータ | 型 | 説明 | 例 |
|-----------|-----|------|-----|
| `query` / `search` | string | 企業名またはファイル名で検索 | `クスリのアオキ` |
| `company_id` | string | 企業ID | `S100U8R6` |
| `fiscal_year` | string | 会計年度 | `FY2021` |
| `file_name` | string | ファイル名（部分一致） | `honbun` |
| `include_content` | boolean | Storageからコンテンツを取得 | `true` |
| `limit` | number | 取得件数（デフォルト: 20） | `10` |
| `offset` | number | オフセット（デフォルト: 0） | `20` |

#### レスポンス例
```json
{
  "message": "Documents retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "company_id": "S100U8R6",
      "company_name": "株式会社クスリのアオキホールディングス",
      "fiscal_year": "FY2021",
      "file_name": "0101010_honbun_jpcrp030000-asr-001_E03549-000_2021-05-20_01_2021-08-18_ixbrl.md",
      "file_type": "honbun",
      "storage_path": "S100U8R6/PublicDoc_markdown/0101010_honbun_...",
      "content": "【企業の概況】..." // include_content=trueの場合
    }
  ],
  "pagination": {
    "total": 101983,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### POST - 特定企業のドキュメント一括取得
企業IDを指定して、その企業の全ドキュメントとコンテンツを取得。

#### リクエストボディ
```json
{
  "company_id": "S100U8R6",
  "fiscal_year": "FY2021",  // オプション
  "file_names": ["0101010_honbun_...", "0102010_honbun_..."]  // オプション
}
```

#### レスポンス例
```json
{
  "message": "Documents retrieved successfully",
  "company": {
    "id": "S100U8R6",
    "name": "株式会社クスリのアオキホールディングス",
    "description": "ドラッグストアチェーンの運営"
  },
  "documents": [
    {
      "company_id": "S100U8R6",
      "company_name": "株式会社クスリのアオキホールディングス",
      "file_name": "0101010_honbun_...",
      "content": "【企業の概況】...",
      "content_length": 25480
    }
  ],
  "summary": {
    "total_documents": 10,
    "successful_downloads": 10,
    "failed_downloads": 0
  }
}
```

## 使用例

### 1. 企業名で検索
```bash
# クスリのアオキを検索
curl "http://localhost:3000/api/v1/markdown-documents?query=%E3%82%AF%E3%82%B9%E3%83%AA%E3%81%AE%E3%82%A2%E3%82%AA%E3%82%AD"
```

### 2. コンテンツ付きで取得
```bash
# 最初の5件をコンテンツ付きで取得
curl "http://localhost:3000/api/v1/markdown-documents?limit=5&include_content=true"
```

### 3. 特定企業の全ドキュメント取得
```bash
curl -X POST http://localhost:3000/api/v1/markdown-documents \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "S100U8R6",
    "fiscal_year": "FY2021"
  }'
```

### 4. ページネーション
```bash
# 2ページ目を取得（21-40件目）
curl "http://localhost:3000/api/v1/markdown-documents?limit=20&offset=20"
```

## JavaScript/TypeScript 使用例

```javascript
// 企業検索
async function searchCompanyDocuments(companyName) {
  const query = encodeURIComponent(companyName);
  const response = await fetch(`/api/v1/markdown-documents?query=${query}&include_content=true`);
  const data = await response.json();
  return data.documents;
}

// 特定企業の全ドキュメント取得
async function getCompanyDocuments(companyId) {
  const response = await fetch('/api/v1/markdown-documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_id: companyId
    })
  });
  const data = await response.json();
  return data.documents;
}
```

## 注意事項

1. **Storage アクセス**: 
   - Service Role キーが必要（環境変数: `SUPABASE_SERVICE_ROLE_KEY`）
   - Anon キーではStorageアクセス不可

2. **パフォーマンス**:
   - `include_content=true`は処理が重いため、必要な場合のみ使用
   - 大量のドキュメント取得時はページネーションを活用

3. **データ整合性**:
   - `markdown_files_metadata`と`companies`テーブルのIDマッチング率は約10.62%
   - 未照合のレコードも多数存在（ID形式の違いによる）

4. **ファイルサイズ**:
   - 大きなMarkdownファイルは最初の50,000文字に制限
   - 完全なコンテンツが必要な場合は個別取得を推奨

## エラーハンドリング

| HTTPステータス | 説明 |
|---------------|------|
| 200 | 成功 |
| 400 | リクエストパラメータエラー |
| 404 | ドキュメントが見つからない |
| 500 | サーバーエラー |

## テスト

```bash
# テストスクリプトの実行
node scripts/test-markdown-api.js
```

## 関連ファイル
- API実装: `app/api/v1/markdown-documents/route.ts`
- テストスクリプト: `scripts/test-markdown-api.js`
- メタデータ更新: `scripts/update-markdown-metadata-names.js`
- 未照合分析: `scripts/analyze-unmatched-records.js`