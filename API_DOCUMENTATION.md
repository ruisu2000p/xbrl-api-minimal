# XBRL Financial Data API Documentation

## 概要

XBRL財務データAPIは、日本企業の有価証券報告書データへのプログラマティックなアクセスを提供します。

### ベースURL
```
https://xbrl-api-minimal.vercel.app/api
```

### 認証
すべてのAPIリクエストには、HTTPヘッダーに`X-API-Key`が必要です。

```http
X-API-Key: xbrl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### エラーハンドリング
APIのエラーレスポンスは統一されたフォーマットで返されます。詳細なエラーコードとその対処法については、[エラーコードリファレンス](./docs/ERROR_CODES.md)を参照してください。

### レート制限
APIキーのティアに応じたレート制限が適用されます：
- **Free**: 10リクエスト/分
- **Basic**: 100リクエスト/分
- **Premium**: 1000リクエスト/分
- **Enterprise**: 10000リクエスト/分

## エンドポイント

### 1. 企業検索
企業マスターデータから企業情報を検索します。

#### エンドポイント
```
GET /v1/companies
```

#### パラメータ

| パラメータ | 型 | 説明 | 必須 |
|-----------|-----|------|------|
| company_name | string | 企業名（部分一致） | No |
| limit | integer | 取得件数（デフォルト: 10） | No |

#### リクエスト例
```bash
curl -X GET "https://xbrl-api-minimal.vercel.app/api/v1/companies?company_name=トヨタ&limit=5" \
  -H "X-API-Key: your-api-key"
```

#### レスポンス例
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "doc_id": "S100CLML",
      "company_name": "トヨタ自動車株式会社",
      "document_name": "有価証券報告書",
      "fiscal_year": "FY2024",
      "fiscal_period": "2024-03-31",
      "submit_date": "2024-06-28",
      "created_at": "2025-09-18T12:00:00Z"
    }
  ],
  "count": 1,
  "tier": "basic"
}
```

### 2. ドキュメント検索
財務ドキュメント（Markdownファイル）を検索します。

#### エンドポイント
```
GET /v1/documents
```

#### パラメータ

| パラメータ | 型 | 説明 | 必須 |
|-----------|-----|------|------|
| company_id | string | 企業ID（docID） | No |
| fiscal_year | string | 会計年度（例: FY2024） | No |
| file_type | string | ファイルタイプ（AuditDoc, PublicDoc） | No |
| limit | integer | 取得件数（デフォルト: 20） | No |

#### リクエスト例
```bash
curl -X GET "https://xbrl-api-minimal.vercel.app/api/v1/documents?fiscal_year=FY2024&file_type=PublicDoc&limit=10" \
  -H "X-API-Key: your-api-key"
```

#### レスポンス例
```json
{
  "success": true,
  "data": [
    {
      "id": "7db465cd-0fad-4f6f-ba22-a99cc2adda15",
      "company_id": "S100CLML",
      "company_name": "トヨタ自動車株式会社",
      "fiscal_year": "FY2024",
      "file_name": "jpcrp_cor_2024-03-31.md",
      "file_type": "PublicDoc",
      "storage_path": "FY2024/S100CLML_hash/PublicDoc_markdown/jpcrp_cor_2024-03-31.md",
      "public_url": "https://wpwqxhyiglbtlaimrjrx.supabase.co/storage/v1/object/public/markdown-files/...",
      "created_at": "2025-09-16T17:11:07.857684+00:00",
      "updated_at": "2025-09-16T17:11:07.857684+00:00"
    }
  ],
  "count": 1
}
```

### 3. 企業検索（POST）
より詳細な条件で企業を検索します。

#### エンドポイント
```
POST /v1/companies
```

#### リクエストボディ
```json
{
  "company_name": "トヨタ",
  "doc_id": "S100CLML",
  "fiscal_year": "FY2024"
}
```

#### パラメータ

| パラメータ | 型 | 説明 | 必須 |
|-----------|-----|------|------|
| company_name | string | 企業名（部分一致） | No |
| doc_id | string | 企業のドキュメントID | No |
| fiscal_year | string | 会計年度 | No |

#### リクエスト例
```bash
curl -X POST "https://xbrl-api-minimal.vercel.app/api/v1/companies" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "トヨタ", "fiscal_year": "FY2024"}'
```

### 4. ドキュメント検索（POST）
より詳細な条件でドキュメントを検索します。

#### エンドポイント
```
POST /v1/documents
```

#### リクエストボディ
```json
{
  "company_name": "トヨタ",
  "company_id": "S100CLML",
  "fiscal_year": "FY2024",
  "file_type": "PublicDoc"
}
```

#### パラメータ

| パラメータ | 型 | 説明 | 必須 |
|-----------|-----|------|------|
| company_name | string | 企業名（部分一致） | No |
| company_id | string | 企業ID | No |
| fiscal_year | string | 会計年度 | No |
| file_type | string | ファイルタイプ | No |

## エラーレスポンス

### 認証エラー
```json
{
  "error": "API key is required"
}
```
```json
{
  "error": "Invalid API key"
}
```

### サーバーエラー
```json
{
  "error": "Internal server error"
}
```

## レート制限

APIキーのティアに応じてレート制限が適用されます：

| ティア | 分あたり | 時間あたり | 日あたり |
|-------|----------|------------|----------|
| Free | 100 | 2,000 | 50,000 |
| Basic | 300 | 5,000 | 100,000 |
| Pro | 600 | 10,000 | 200,000 |

## ステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | 不正なリクエスト |
| 401 | 認証エラー |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

## SDK/ライブラリ

### JavaScript/TypeScript
```javascript
// Fetchを使用
const response = await fetch('https://xbrl-api-minimal.vercel.app/api/v1/companies', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
});
const data = await response.json();
```

### Python
```python
import requests

headers = {
    'X-API-Key': 'your-api-key'
}
response = requests.get(
    'https://xbrl-api-minimal.vercel.app/api/v1/companies',
    headers=headers
)
data = response.json()
```

### cURL
```bash
curl -X GET "https://xbrl-api-minimal.vercel.app/api/v1/companies" \
  -H "X-API-Key: your-api-key"
```

## 注意事項

1. **APIキーの管理**
   - APIキーは安全に保管し、公開リポジトリにコミットしない
   - 定期的にAPIキーをローテーションする

2. **データの利用**
   - このAPIは情報提供のみを目的としており、投資助言ではありません
   - データの正確性は保証されません

3. **レート制限**
   - レート制限を超えた場合は、時間をおいて再試行してください
   - 大量のデータが必要な場合は、Proプランへのアップグレードをご検討ください

## サポート

質問や問題がある場合は、[GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)でお問い合わせください。

---

最終更新: 2025年9月18日
バージョン: v7.0.0