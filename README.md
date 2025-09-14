# XBRL Financial Data API v4.0 - Commercial Edition

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Version](https://img.shields.io/badge/Version-4.0.0-green)](https://github.com/ruisu2000p/xbrl-api-minimal)
[![License: Commercial](https://img.shields.io/badge/License-Commercial-red)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-v3.0-blue)](https://modelcontextprotocol.io)

商用XBRL財務データAPIサービス - 日本の上場企業の有価証券報告書をMarkdown形式で提供

## 🚀 v5.0.0 - 新アーキテクチャリリース

### 主要アップデート
- ✅ **Supabase Edge Functions移行** - Vercel APIレイヤーを削除し、直接的な通信を実現
- ✅ **Row Level Security (RLS)** - データベースレベルでのセキュリティ強化
- ✅ **パフォーマンス向上** - 不要な中継を排除し、レスポンス時間を短縮
- ✅ **商用プラン設定** - 2,980円/月からの柔軟な価格設定
- ✅ **HMAC-SHA256認証** - エンタープライズグレードのセキュリティ

## 🌟 特徴

- **286,742件**の財務文書を収録
- **1,100社以上**の上場企業データ
- **4年分のデータ** - 2020年〜2024年の財務情報
- **Markdown形式**で即座に利用可能
- **HMAC-SHA256**セキュア認証
- **レート制限**対応（プラン別）
- **キャッシュ**による高速レスポンス
- **99.9% SLA**（Pro以上）

## 💰 料金プラン

| プラン | 月額 | APIコール/月 | 企業数 | サポート |
|--------|------|--------------|--------|----------|
| Free Trial | 無料 | 10,000 | 10社 | コミュニティ |
| **Standard** | **¥2,980** | **100,000** | **1,000社** | **メール(24h)** |
| Pro | ¥9,800 | 500,000 | 無制限 | 優先(4h) |
| Enterprise | ¥50,000～ | 2,000,000 | 無制限 | 専用(1h) |

## 🔧 技術スタック

- **Frontend**: Next.js 14 (Vercel)
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Security**: Row Level Security (RLS), HMAC-SHA256
- **Monitoring**: Sentry
- **CDN**: Cloudflare

## 📦 インストール

```bash
# Clone repository
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

## 🔑 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
API_KEY_SECRET=your-api-key-secret-minimum-32-chars

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 📚 API ドキュメント

### 認証

全てのAPIエンドポイントは認証が必要です：

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.xbrl-data.com/v1/companies
```

### 主要エンドポイント

#### 企業検索
```bash
GET https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/search-companies?query=トヨタ
```

#### データクエリ
```bash
POST https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/query-my-data
```

#### Markdownファイル取得
```bash
GET https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/get-storage-md?path=FY2024/...

詳細は [OpenAPI仕様書](public/openapi.yaml) を参照

## 🧪 テスト

```bash
# 全テスト実行
npm test

# 統合テスト
npm run test:integration

# セキュリティテスト
npm run test:security

# CI用テスト
npm run test:ci
```

## 🚀 デプロイ

```bash
# Staging環境
npm run deploy:staging

# Production環境
npm run deploy:production
```

## 📊 パフォーマンス

- **レスポンス時間**: < 200ms (キャッシュヒット時)
- **同時接続数**: 最大200
- **稼働率**: 99.9% SLA (Pro以上)
- **データ更新**: リアルタイム（Standard以上）

## 🔒 セキュリティ

- HMAC-SHA256によるAPIキー認証
- レート制限（プラン別）
- SQLインジェクション対策
- XSS対策
- CORS設定
- WAF (Web Application Firewall)

## 📈 アーキテクチャ

```
┌─────────────┐            ┌──────────────────────────┐
│   Client    │◀──────────▶│   Supabase Backend       │
│  (Next.js)  │            │                          │
└─────────────┘            │  ┌────────────────────┐ │
       │                   │  │  Edge Functions    │ │
       │                   │  │  (Deno Runtime)    │ │
       ▼                   │  └────────────────────┘ │
┌─────────────┐            │  ┌────────────────────┐ │
│Claude MCP   │◀──────────▶│  │  PostgreSQL + RLS  │ │
│             │            │  └────────────────────┘ │
└─────────────┘            │  ┌────────────────────┐ │
                           │  │  Storage           │ │
                           │  └────────────────────┘ │
                           └──────────────────────────┘
```

## 🤝 Claude Desktop MCP 統合

Claude Desktopでの使用：

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"]
    }
  }
}
```

## 📄 ライセンス

Commercial License - 詳細は[LICENSE](LICENSE)をご確認ください。

## 🔗 リンク

- [API Documentation](https://api.xbrl-data.com/docs)
- [OpenAPI Specification](https://api.xbrl-data.com/openapi.yaml)
- [Status Page](https://status.xbrl-data.com)
- [Support](mailto:support@xbrl-data.com)
- [NPM Package](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

## 🏆 実績

- 286,742件の財務文書
- 1,100社以上の企業データ
- 99.9%の稼働率
- 200ms以下のレスポンス時間

---

© 2024 XBRL API Minimal. All rights reserved.