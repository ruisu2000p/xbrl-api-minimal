# Financial Data API Documentation

## 概要
Supabase Storageに保存されている有価証券報告書のMarkdownファイルから財務データを抽出するAPIです。

## エンドポイント

### GET /api/v1/financial-data

企業の財務データを取得します。

#### パラメータ
- `company_id` (required): 企業ID（例: S100L777）
- `action` (optional): 'ranking'を指定すると売上高ランキングを取得

#### レスポンス例（個別企業）
```json
{
  "company_id": "S100L777",
  "company_name": "株式会社精養軒",
  "ticker": "9734",
  "sector": "サービス業",
  "financial_data": {
    "revenue": 1234567,
    "operating_income": 234567,
    "net_income": 123456,
    "fiscal_year": "2021"
  },
  "data_source": "markdown_files",
  "documents_count": 15
}
```

#### レスポンス例（ランキング）
```json
{
  "rankings": [
    {
      "company_id": "S100XXXX",
      "company_name": "トヨタ自動車株式会社",
      "ticker": "7203",
      "revenue": 31379507000
    },
    // ... 他の企業
  ],
  "fiscal_year": "2021"
}
```

### POST /api/v1/financial-data

複数企業の財務データを一括取得します。

#### リクエストボディ
```json
{
  "company_ids": ["S100L777", "S100L3K4", "S100L5HA"],
  "metrics": ["revenue", "net_income"]
}
```

## MCP (Claude Desktop) での使用方法

### 新しいツール

1. **get_financial_data**: 特定企業の財務データを取得
   ```
   使用例: "S100L777の財務データを取得してください"
   ```

2. **get_revenue_ranking**: 売上高ランキングを取得
   ```
   使用例: "2021年の売上高トップ50社を教えてください"
   ```

### 設定確認
MCPサーバーの設定ファイル（`claude_desktop_config.json`）が以下のように設定されていることを確認：

```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-api-minimal\\mcp-server.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_live_test_admin_key_2025"
      }
    }
  }
}
```

## データソース

### Supabase Storage構造
```
securities-reports/
├── S100L777/
│   ├── PublicDoc_markdown/
│   │   ├── 0000000_header_*.md
│   │   ├── 0101010_honbun_*.md
│   │   ├── 0105000_honbun_*.md  # ← 経理の状況（財務データ含む）
│   │   └── ...
│   └── AuditDoc_markdown/
│       └── ...
├── S100L3K4/
│   └── ...
└── ...（4,225社分）
```

### 財務データ抽出対象
- **0105000番台**: 経理の状況セクション
- **0105310番台**: 連結財務諸表
- 抽出項目:
  - 売上高/営業収益
  - 営業利益
  - 当期純利益/親会社株主に帰属する当期純利益
  - 総資産
  - 純資産

## トラブルシューティング

### "Company not found"エラー
- 企業IDが正しいか確認（例: S100L777）
- companiesテーブルに企業が存在するか確認

### "Failed to fetch financial documents"エラー
- Supabase Storageにファイルがアップロードされているか確認
- financial_documentsテーブルが作成されているか確認

### 財務データが空の場合
- Markdownファイルに財務データが含まれているか確認
- 0105000番台のファイルが存在するか確認
- データ抽出パターンが正しいか確認

## 今後の改善予定

1. **データ精度向上**
   - より高度な財務データ抽出アルゴリズム
   - 複数年度の比較機能

2. **パフォーマンス最適化**
   - 財務データのキャッシング
   - バッチ処理の最適化

3. **機能拡張**
   - セクター別ランキング
   - 成長率計算
   - 財務指標（ROE、ROA等）の自動計算

## 更新履歴

- 2025-08-16: 初版作成
  - Supabase Storage対応
  - MCP統合
  - 売上高ランキング機能追加