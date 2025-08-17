# CLAUDE.md - XBRL財務データAPI開発ガイド

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイドラインと開発履歴を提供します。

## 🎯 プロジェクト概要

**XBRL財務データAPI** - 日本の上場企業4,231社の有価証券報告書データを提供するWebアプリケーション

### 技術スタック
- **フロントエンド**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Storage)
- **デプロイ**: Vercel
- **認証**: カスタム認証システム
- **グラフ**: Recharts
- **アイコン**: React Feather
- **日付処理**: date-fns

### デプロイメント情報
- **本番URL**: https://xbrl-api-minimal.vercel.app/
- **Supabase Project**: https://zxzyidqrvzfzhicfuhlo.supabase.co
- **GitHub**: https://github.com/ruisu2000p/xbrl-api-minimal

---

## 📋 開発履歴（2025年8月16日）

### 1. ビルドエラーの修正

#### 問題1: UTF-8エンコーディングエラー
**影響ファイル**:
- `app/admin-reset/page.tsx`
- `app/admin/login/page.tsx`
- `app/docs/page.tsx`
- `app/forgot-password/page.tsx`
- `app/register/page.tsx`
- `app/reset-password/page.tsx`

**症状**: 日本語文字の文字化け（例：「管理者」→「管琁E��」）

**解決策**:
- すべてのファイルをUTF-8で再エンコーディング
- 文字化けした日本語を正しい文字に置換

#### 問題2: 構文エラー
**影響ファイル**: `app/register/page.tsx`

**症状**: コメントとコードが同一行に混在
```typescript
// 誤: // welcomeページへリダイレクト        router.push('/welcome');
// 正: // welcomeページへリダイレクト
//     router.push('/welcome');
```

**解決策**: コメントとコードを適切に改行

#### 問題3: TypeScriptの型エラー
**影響ファイル**: 
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`

**症状**: 
- 関数の型不一致（MouseEventHandler vs カスタム関数）
- null許容型の未考慮

**解決策**:
```typescript
// 誤: onClick={generateNewApiKey}
// 正: onClick={() => generateNewApiKey()}

// 誤: const updatedUser = { ...user, ...formData };
// 正: if (user) {
//       const updatedUser = { ...user, ...formData };
//     }
```

---

### 2. ダッシュボード機能の大幅強化

#### 新機能追加
1. **リアルタイムデータ更新**
   - 自動更新間隔の設定（10秒/30秒/1分/5分）
   - ライブ接続ステータス表示
   - 最終更新時刻表示

2. **高度なAPIキー管理**
   - 複数APIキーのサポート
   - キーごとの権限管理
   - 使用状況トラッキング
   - キーローテーション機能

3. **使用状況分析**
   - Rechartsによるプロフェッショナルなグラフ
   - 30日間のトレンド分析
   - 時間別使用パターン
   - エンドポイント別使用率

4. **アクティビティモニタリング**
   - 詳細なフィルタリング機能
   - ページネーション
   - CSVエクスポート
   - エラー詳細表示

5. **パフォーマンスメトリクス**
   - P95レスポンスタイム
   - システム稼働率
   - エンドポイント別レイテンシ
   - レート制限警告

6. **通知システム**
   - システム通知
   - メンテナンススケジュール
   - 使用量アラート（80%/90%警告）
   - 更新履歴

---

## 🛠️ 一般的な開発コマンド

### 開発環境の起動
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# 本番サーバーの起動
npm start
```

### Git操作
```bash
# 変更をコミット
git add -A
git commit -m "feat: 機能の説明"
git push origin main
```

### TypeScriptのチェック
```bash
# 型エラーのチェック
npx tsc --noEmit

# 特定ファイルのチェック
npx tsc --noEmit app/dashboard/page.tsx
```

---

## ⚠️ 既知の問題と対策

### 1. Vercelビルドエラー
- **原因**: UTF-8エンコーディング問題、TypeScript型エラー
- **対策**: ローカルでビルドテストを実行してから push

### 2. 動的レンダリング警告
- **原因**: `headers`や`cookies`の使用
- **対策**: これは正常な動作。APIルートでは必要

### 3. 文字化け
- **原因**: ファイルエンコーディング
- **対策**: すべてのファイルをUTF-8で保存

---

## 📝 コーディング規約

### TypeScript
- 厳密な型定義を使用
- `any`型は避ける
- null/undefinedの可能性を考慮

### React
- 関数コンポーネントを使用
- カスタムフックで状態管理ロジックを分離
- 動的インポートで初期バンドルサイズを削減

### スタイリング
- Tailwind CSSを使用
- レスポンシブデザインを考慮
- ダークモード対応（必要に応じて）

### コミットメッセージ
```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの更新
style: コードスタイルの変更
refactor: リファクタリング
test: テストの追加・修正
chore: ビルドプロセスやツールの変更
```

---

## 🚀 デプロイメントフロー

1. ローカルで開発・テスト
2. GitHubにプッシュ
3. Vercelが自動的にビルド・デプロイ
4. ビルドエラーがある場合は修正して再プッシュ

---

## 📊 プロジェクト統計

- **対応企業数**: 4,231社
- **データ期間**: 2021年4月〜2022年3月
- **APIエンドポイント**: 15+
- **ページ数**: 31+
- **コンポーネント数**: 50+

---

## 🔄 今後の改善提案

1. **パフォーマンス最適化**
   - Server Componentsの活用
   - 画像の最適化
   - バンドルサイズの削減

2. **機能拡張**
   - WebSocket対応でリアルタイム更新
   - 多言語対応（英語版）
   - モバイルアプリ開発

3. **セキュリティ強化**
   - 2要素認証
   - IPホワイトリスト
   - APIレート制限の強化

---

---

## 📋 開発履歴（2025年8月17日）

### 1. Supabase Storage統合とMCPサーバー実装

#### 背景
- **問題**: 企業データ（companiesテーブル）は存在するが、財務データ（Markdownファイル）にアクセスできない
- **原因**: APIエンドポイントがStorageと連携していない

#### 実装内容

##### 1. データ構造の確認
```
Supabase構成:
├── テーブル
│   ├── companies (5,220社の基本情報)
│   ├── profiles (ユーザープロファイル)
│   └── api_keys (APIキー管理)
└── Storage
    └── markdown-files/
        └── S100LJ4F/  # 亀田製菓の例
            └── PublicDoc_markdown/
                ├── 0101010_honbun_...md  # 企業概況
                ├── 0102010_honbun_...md  # 事業状況
                └── ... (全10ファイル)
```

##### 2. MCPサーバー開発
- **mcp-server-with-storage.js**: Supabase Storage直接アクセス版
- **認証**: Service Roleキーを使用
- **メソッド**: POSTでファイルリスト取得

```javascript
// Storage アクセス例
const listUrl = `${SUPABASE_URL}/storage/v1/object/list/markdown-files`;
const response = await fetch(listUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
  },
  body: JSON.stringify({
    prefix: `${companyId}/PublicDoc_markdown`,
    limit: 100,
  }),
});
```

##### 3. Claude Desktop統合
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-api-minimal\\mcp-server\\mcp-server-with-storage.js"],
      "env": {
        "XBRL_API_KEY": "xbrl_live_...",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

#### 取得可能なデータ

##### 亀田製菓（S100LJ4F）の財務データ例
| 決算年月 | 売上高（百万円） | 経常利益（百万円） | 当期純利益（百万円） |
|---------|-----------------|-------------------|---------------------|
| 2017年3月 | 98,206 | 7,122 | 2,702 |
| 2018年3月 | 99,522 | 6,451 | 4,110 |
| 2019年3月 | 100,041 | 6,573 | 4,402 |
| 2020年3月 | 103,808 | 6,909 | 4,463 |
| 2021年3月 | 103,305 | 6,889 | 4,757 |

### 2. Vercelビルドエラー修正

#### 問題
- `package.json`の`"type": "module"`がNext.jsと競合
- エラー: `module is not defined in ES module scope`

#### 解決策
1. `package.json`から`"type": "module"`を削除
2. MCPサーバーファイルを別ディレクトリ（`mcp-server/`）に移動
3. `.gitignore`にMCP関連ファイルを追加

### 3. APIキー管理改善

#### 実装内容
- SHA256ハッシュでAPIキー保存
- プレフィックス・サフィックスのみ表示
- レート制限設定（100req/分、10,000req/時、100,000req/日）

---

## 🛠️ MCP（Model Context Protocol）サーバー

### 利用可能なツール

1. **search_companies** - 企業検索
   - 企業名、ID、ティッカーで検索
   - ページネーション対応

2. **get_company_with_storage** - 企業詳細＋財務データ
   - companiesテーブルから基本情報
   - Storageから財務データ取得
   - 自動的に財務指標を抽出

3. **get_financial_data** - 詳細財務データ
   - Markdownファイル直接アクセス
   - 財務メトリクス自動抽出
   - テーブルデータパース

### セットアップ手順

1. **依存関係インストール**
```bash
cd mcp-server
npm install @modelcontextprotocol/sdk node-fetch
```

2. **Claude Desktop設定**
- `%APPDATA%\Claude\claude_desktop_config.json`を編集
- xbrl-apiサーバーを追加

3. **Claude Desktop再起動**
- 設定反映のため再起動必要

---

## 📊 データ統計

- **総企業数**: 5,220社（2025年8月17日時点）
- **データ期間**: 2021年4月〜2022年3月
- **ファイル形式**: Markdown変換済み
- **ストレージ**: Supabase Storage（markdown-filesバケット）

---

## ⚠️ 既知の問題と対策

### 1. Claude Desktop Overloaded
- **原因**: 複数MCPサーバーの同時起動
- **対策**: 必要最小限のサーバーのみ有効化

### 2. Storage アクセスエラー
- **原因**: 認証キーの不一致
- **対策**: Service Roleキーを使用（Anon keyではアクセス不可）

### 3. Vercelデプロイ404エラー
- **原因**: 新規エンドポイントのビルド遅延
- **対策**: プッシュ後数分待機

---

最終更新: 2025年8月17日 16:10 JST