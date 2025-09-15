# XBRL API Minimal - 新アーキテクチャ

## 概要
XBRL財務データAPIシステムの新しいアーキテクチャでは、Vercelをフロントエンド専用とし、すべてのバックエンド機能をSupabaseに統合しました。

## システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                        ユーザー                              │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────┐     ┌──────────────────────────┐
│   Vercel Frontend       │     │   Claude Desktop         │
│   (Next.js 14)          │     │   (XBRL MCP)             │
│                         │     │                          │
│ - ユーザー登録          │     │ - query-my-data          │
│ - ログイン              │     │ - get-storage-md         │
│ - APIキー表示           │     │ - search-companies       │
│ - プラン管理            │     │                          │
└────────┬────────────────┘     └──────────┬───────────────┘
         │                                  │
         │ Supabase Client SDK              │ MCP Direct Connection
         │                                  │
         ▼                                  ▼
┌──────────────────────────────────────────────────────────┐
│                     Supabase Backend                      │
│                                                           │
│ ┌───────────────────────────────────────────────────┐    │
│ │              Edge Functions (Deno)                │    │
│ │                                                   │    │
│ │ - /functions/v1/search-companies                  │    │
│ │ - /functions/v1/query-my-data                    │    │
│ │ - /functions/v1/get-storage-md                   │    │
│ │ - /functions/v1/keys_issue                       │    │
│ └───────────────────────────────────────────────────┘    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐    │
│ │                  Database (PostgreSQL)            │    │
│ │                                                   │    │
│ │ Tables:                                           │    │
│ │ - api_keys (APIキー管理)                         │    │
│ │ - companies (企業マスタ)                         │    │
│ │ - markdown_files_metadata (文書メタデータ)       │    │
│ │ - user_subscriptions (サブスクリプション)        │    │
│ │ - subscription_plans (プラン定義)                │    │
│ └───────────────────────────────────────────────────┘    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐    │
│ │                  Storage                          │    │
│ │                                                   │    │
│ │ Buckets:                                          │    │
│ │ - markdown-files (Markdown文書)                  │    │
│ │ - documents (その他文書)                         │    │
│ └───────────────────────────────────────────────────┘    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐    │
│ │                  Auth                             │    │
│ │                                                   │    │
│ │ - ユーザー認証                                    │    │
│ │ - セッション管理                                  │    │
│ │ - パスワードリセット                              │    │
│ └───────────────────────────────────────────────────┘    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐    │
│ │           Row Level Security (RLS)                │    │
│ │                                                   │    │
│ │ - api_keys: ユーザー自身のキーのみ操作可能       │    │
│ │ - companies: 認証済みユーザーのみアクセス可能    │    │
│ │ - markdown_files_metadata: APIキー認証でアクセス │    │
│ └───────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## 主な変更点

### 1. Vercel API Routes → Supabase Edge Functions
- **削除**: `/app/api/v1/*` のすべてのルート
- **新規作成**: Supabase Edge Functions
  - `search-companies`: 企業検索API
  - `query-my-data`: データクエリAPI
  - `get-storage-md`: Markdownファイル取得API
  - `keys_issue`: APIキー発行（既存を更新）

### 2. フロントエンドの変更
- **DashboardClient.tsx**:
  - Vercel API呼び出しを削除
  - Supabase Client SDKを直接使用
  - Edge Functions呼び出しに変更

### 3. セキュリティ強化
- **RLSポリシー**: すべてのテーブルにRow Level Securityを適用
- **APIキー認証**: SHA-256ハッシュ化とHMAC検証
- **プランベースのアクセス制御**: ユーザープランに応じたレート制限

## デプロイ手順

### 1. Supabase Edge Functionsのデプロイ
```bash
# Supabase CLIでログイン
supabase login

# Edge Functionsをデプロイ
supabase functions deploy search-companies
supabase functions deploy query-my-data
supabase functions deploy get-storage-md
supabase functions deploy keys_issue
```

### 2. RLSポリシーの適用
```bash
# マイグレーションを実行
supabase db push
```

### 3. Vercelへのデプロイ
```bash
# ビルドとデプロイ
vercel --prod
```

## 環境変数

### Vercel (フロントエンド用)
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名キー

### Supabase (バックエンド用)
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（自動設定）
- `KEY_PEPPER`: APIキーハッシュ用ペッパー（Edge Functions用）

## アクセスパターン

### 1. Webユーザー
1. Vercelフロントエンドにアクセス
2. Supabase Authで認証
3. ダッシュボードでAPIキーを生成
4. APIキーを使用してデータアクセス

### 2. API開発者
1. APIキーを取得
2. Supabase Edge Functionsに直接リクエスト
3. `x-api-key`ヘッダーで認証
4. JSONレスポンスを受信

### 3. Claude Desktop (MCP)
1. XBRL MCPを設定
2. Supabase Edge Functionsに直接接続
3. APIキー認証でデータアクセス
4. 財務データの分析・処理

## メリット

1. **シンプルな構成**: Vercel APIレイヤーを削除し、直接的な通信
2. **パフォーマンス向上**: 不要な中継を排除
3. **セキュリティ強化**: RLSによる細かいアクセス制御
4. **スケーラビリティ**: Supabase Edge Functionsの自動スケーリング
5. **コスト削減**: Vercel API実行時間の削減

## 今後の拡張

- WebSocketによるリアルタイム更新
- Supabase Vectorによる意味検索
- Supabase Edgeによるグローバル配信
- より詳細な使用量分析とレポート