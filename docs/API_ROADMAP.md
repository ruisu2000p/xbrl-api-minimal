# XBRL Financial Data API - 実装ロードマップ

## 📊 現在の実装状況

### ✅ 完了済み
- **データ基盤**
  - 4,131社の有価証券報告書をSupabaseストレージに格納
  - 各企業10-25個のMarkdownファイル（合計53,434ファイル）
  - 2021年度データ完全アップロード

- **基本API**
  - Express.jsベースのAPIサーバー（ポート5001）
  - 企業別ファイル一覧取得
  - 個別ファイルコンテンツ取得
  - セクション自動判定機能

## 🚀 今後の実装計画

### Phase 1: コアAPI機能拡張（1-2週間）

#### 1.1 検索・フィルタリング機能
```javascript
GET /api/companies/search
  ?name=トヨタ           // 企業名検索
  &ticker=7203          // 証券コード検索
  &industry=自動車       // 業種フィルタ
  &market=東証プライム    // 市場区分フィルタ
```

#### 1.2 財務データ抽出API
```javascript
GET /api/companies/:id/financials
  ?year=2021
  &metrics=revenue,profit,roe  // 特定指標のみ取得
```

#### 1.3 比較分析API
```javascript
POST /api/analysis/compare
Body: {
  companies: ["S100LJ4F", "S100LJ65"],
  sections: ["企業の概況", "事業の状況"],
  year: 2021
}
```

### Phase 2: データ処理・分析機能（2-3週間）

#### 2.1 財務指標自動計算
- KPI自動抽出（売上高、営業利益、純利益、ROE、ROA等）
- 成長率計算（前年比、CAGR）
- 業界平均との比較

#### 2.2 セグメント情報API
```javascript
GET /api/companies/:id/segments
  ?type=geographic  // 地域別
  ?type=business    // 事業別
```

#### 2.3 時系列データAPI
```javascript
GET /api/companies/:id/timeseries
  ?metric=revenue
  &from=2019&to=2021
```

### Phase 3: AI連携・高度な分析（3-4週間）

#### 3.1 AI分析エンドポイント
```javascript
POST /api/ai/analyze
Headers: X-User-API-Key: claude_api_key
Body: {
  company_id: "S100LJ4F",
  sections: ["事業等のリスク"],
  prompt: "リスク要因を3つに要約"
}
```

#### 3.2 業界トレンド分析
```javascript
GET /api/industries/:industry/trends
  ?year=2021
  &metrics=growth,profitability
```

#### 3.3 ピアグループ分析
```javascript
GET /api/companies/:id/peers
  ?limit=10
  &criteria=market_cap,industry
```

### Phase 4: パフォーマンス最適化（2週間）

#### 4.1 キャッシング戦略
- Redis導入によるレスポンスキャッシュ
- 頻繁にアクセスされるデータの事前計算
- CDNエッジキャッシング

#### 4.2 データベース最適化
- PostgreSQL移行（現在のSupabase利用を拡張）
- インデックス最適化
- マテリアライズドビュー活用

#### 4.3 バッチ処理API
```javascript
POST /api/batch/process
Body: {
  requests: [
    { method: "GET", path: "/companies/S100LJ4F/files" },
    { method: "GET", path: "/companies/S100LJ65/files" }
  ]
}
```

### Phase 5: エンタープライズ機能（4週間）

#### 5.1 認証・認可システム
- OAuth 2.0実装
- APIキー管理ダッシュボード
- レート制限（ティア別）
- 使用量トラッキング

#### 5.2 Webhook・リアルタイム更新
```javascript
POST /api/webhooks/subscribe
Body: {
  event: "new_report",
  company_ids: ["S100LJ4F"],
  callback_url: "https://client.com/webhook"
}
```

#### 5.3 データエクスポート
```javascript
POST /api/export
Body: {
  companies: ["S100LJ4F"],
  format: "excel",  // excel, csv, json
  sections: ["all"]
}
```

## 📐 技術アーキテクチャ

### 推奨スタック
```yaml
API Layer:
  - Express.js / Fastify (現在: Express.js)
  - GraphQL (オプション)

データ層:
  - Supabase (PostgreSQL + Storage) ✅
  - Redis (キャッシュ)
  - Elasticsearch (全文検索)

処理層:
  - Bull Queue (バックグラウンドジョブ)
  - Python (財務分析処理)

AI/ML:
  - Claude API (テキスト分析) ✅
  - OpenAI Embeddings (類似検索)
  - TensorFlow (予測モデル)
```

## 📋 API設計原則

### RESTful設計
- 明確なリソース指向URL
- 適切なHTTPメソッド使用
- ステータスコードの正しい利用

### レスポンス形式
```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "timestamp": "2025-08-15T10:00:00Z",
    "version": "1.0",
    "total_count": 100,
    "page": 1
  },
  "links": {
    "self": "/api/companies/S100LJ4F",
    "next": "/api/companies/S100LJ4G"
  }
}
```

### エラーハンドリング
```json
{
  "status": "error",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found",
    "details": { "company_id": "S100XXXX" }
  }
}
```

## 🔒 セキュリティ考慮事項

1. **APIキー管理**
   - ハッシュ化して保存
   - 定期的なローテーション
   - スコープベースの権限

2. **レート制限**
   ```
   Free:  100 req/hour
   Basic: 1000 req/hour
   Pro:   10000 req/hour
   ```

3. **データ検証**
   - 入力サニタイゼーション
   - SQLインジェクション対策
   - XSS防止

## 📈 パフォーマンス目標

- **レスポンスタイム**
  - ファイル一覧: < 200ms
  - ファイル取得: < 500ms
  - 財務分析: < 1000ms

- **可用性**
  - 99.9% アップタイム
  - 自動フェイルオーバー
  - ヘルスチェック監視

## 🗓️ マイルストーン

| Phase | 期間 | 完了予定 | 主要成果物 |
|-------|------|---------|-----------|
| Phase 1 | 1-2週間 | 2025年8月末 | 検索・フィルタリングAPI |
| Phase 2 | 2-3週間 | 2025年9月中旬 | 財務分析機能 |
| Phase 3 | 3-4週間 | 2025年10月初旬 | AI連携 |
| Phase 4 | 2週間 | 2025年10月中旬 | パフォーマンス最適化 |
| Phase 5 | 4週間 | 2025年11月中旬 | エンタープライズ機能 |

## 📚 ドキュメント計画

1. **OpenAPI仕様書** (Swagger)
2. **SDK開発**
   - JavaScript/TypeScript
   - Python
   - Java
3. **利用ガイド**
   - クイックスタート
   - ベストプラクティス
   - サンプルコード

## 🎯 成功指標

- API利用者数: 1000+ 開発者
- 日次APIコール: 100万+
- 平均レスポンスタイム: < 300ms
- エラー率: < 0.1%
- 開発者満足度: 4.5/5.0

---

最終更新: 2025年8月15日