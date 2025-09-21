# XBRL財務API 使用方法ガイド

**最終更新**: 2025年9月21日
**APIバージョン**: v1
**認証方式**: JWT (カスタムAPIキー)

## 概要

XBRL財務APIは、日本の上場企業の財務データ（有価証券報告書）にアクセスするためのRESTful APIです。カスタムAPIキーによる認証を使用し、Markdownファイル形式で財務文書を提供します。

## エンドポイント情報

### ベースURL
```
https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt
```

### 利用可能なエンドポイント

#### 1. ルートエンドポイント
**GET /** - API情報とエンドポイント一覧を取得

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt
```

**レスポンス例:**
```json
{
  "success": true,
  "tier": "free",
  "role": "authenticated",
  "endpoints": [
    {
      "path": "/markdown-files",
      "method": "GET",
      "description": "Markdownファイル検索",
      "params": ["search", "limit", "fiscal_year"]
    },
    {
      "path": "/download",
      "method": "GET",
      "description": "ファイルダウンロード",
      "params": ["path"]
    }
  ]
}
```

#### 2. Markdownファイル検索
**GET /markdown-files** - 財務文書ファイルを検索

**パラメータ:**
- `search` (string, optional): 企業名またはコードで検索
- `limit` (integer, optional): 取得件数制限 (デフォルト: 10)
- `fiscal_year` (string, optional): 会計年度で絞り込み (例: FY2024)

```bash
# 企業名で検索
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt/markdown-files?search=トヨタ&limit=5"

# 年度指定検索
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt/markdown-files?fiscal_year=FY2024&limit=10"
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "S100FLR",
      "company_name": "トヨタ自動車株式会社",
      "file_name": "summary.md",
      "file_type": "PublicDoc",
      "storage_path": "FY2024/S100FLR_company/PublicDoc_markdown/summary.md",
      "fiscal_year": "FY2024",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### 3. ファイルダウンロード
**GET /download** - Markdownファイルの内容をダウンロード

**パラメータ:**
- `path` (string, required): ファイルのストレージパス

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt/download?path=FY2024/S100FLR_company/PublicDoc_markdown/summary.md"
```

**レスポンス:** Markdownファイルの内容（text/markdown形式）

## 認証方式

### APIキー形式
```
xbrl_v1_[32桁の英数字]
```

### 認証ヘッダー
すべてのリクエストに以下のヘッダーを含める必要があります：

```http
Authorization: Bearer xbrl_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

## プログラミング言語別サンプル

### JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

const API_KEY = 'xbrl_v1_your_api_key_here';
const BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function searchCompanies(searchTerm) {
  try {
    const response = await fetch(`${BASE_URL}/markdown-files?search=${encodeURIComponent(searchTerm)}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// 使用例
searchCompanies('トヨタ')
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Python
```python
import requests
import urllib.parse

API_KEY = 'xbrl_v1_your_api_key_here'
BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt'

def search_companies(search_term, limit=10):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    params = {
        'search': search_term,
        'limit': limit
    }

    try:
        response = requests.get(f'{BASE_URL}/markdown-files', headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'API request failed: {e}')
        raise

# 使用例
try:
    result = search_companies('トヨタ')
    print(result)
except Exception as e:
    print(f'Error: {e}')
```

### curl
```bash
#!/bin/bash

API_KEY="xbrl_v1_your_api_key_here"
BASE_URL="https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt"

# 企業検索
search_companies() {
    local search_term="$1"
    local limit="${2:-10}"

    curl -s -H "Authorization: Bearer $API_KEY" \
         -H "Content-Type: application/json" \
         "$BASE_URL/markdown-files?search=$(echo "$search_term" | sed 's/ /%20/g')&limit=$limit"
}

# ファイルダウンロード
download_file() {
    local file_path="$1"

    curl -s -H "Authorization: Bearer $API_KEY" \
         "$BASE_URL/download?path=$(echo "$file_path" | sed 's/ /%20/g')"
}

# 使用例
search_companies "トヨタ" 5
```

## エラーハンドリング

### 一般的なHTTPステータスコード

| ステータス | 説明 | 対処法 |
|-----------|------|--------|
| 200 | 成功 | - |
| 401 | 認証エラー | APIキーを確認してください |
| 404 | リソースが見つからない | パスやパラメータを確認してください |
| 429 | レート制限 | リクエスト頻度を下げてください |
| 500 | サーバーエラー | 時間をおいて再試行してください |

### エラーレスポンス形式
```json
{
  "error": "Authentication failed",
  "details": "Invalid API key",
  "timestamp": "2025-09-21T22:40:00Z"
}
```

## 利用制限

### ティア別制限

#### Free Tier
- 1時間あたり100リクエスト
- 直近1年間のデータのみアクセス可能
- 同時接続数: 5

#### Basic Tier
- 1時間あたり1,000リクエスト
- 全期間のデータにアクセス可能
- 同時接続数: 20

#### Premium Tier
- 1時間あたり10,000リクエスト
- 全期間のデータにアクセス可能
- 優先サポート
- 同時接続数: 100

## データ形式

### 会計年度
- 形式: `FY[西暦4桁]` (例: FY2024)
- 対象期間: 2020年度〜最新年度

### 企業コード
- EDINET提出者コード（例: S100FLR）
- 8桁の英数字

### ファイル種類
- `PublicDoc`: 有価証券報告書
- `AuditDoc`: 監査報告書

## サポート

### よくある質問

**Q: APIキーの取得方法は？**
A: 現在はテスト用のAPIキーを提供しています。本格運用版では専用のダッシュボードから発行予定です。

**Q: データの更新頻度は？**
A: 企業が新しい有価証券報告書を提出次第、数日以内に更新されます。

**Q: 利用可能な企業数は？**
A: 日本の上場企業約3,700社の財務データを提供しています。

### お問い合わせ
- GitHub Issues: [プロジェクトリポジトリ]
- Email: support@xbrl-api.local

---

**注意事項:**
- このAPIは研究・開発目的での利用を想定しています
- 商用利用については別途ライセンス契約が必要です
- データの正確性については各企業の公式発表を確認してください

**最終更新**: 2025年9月21日
**ドキュメントバージョン**: 1.0