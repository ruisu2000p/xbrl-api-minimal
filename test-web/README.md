# XBRL API Web テストインターフェース

## 概要
XBRL APIのWebベースのテストインターフェース。CORSプロキシを含む完全なテスト環境。

## ファイル構成
```
test-web/
├── index.html         # テストUI
├── cors-proxy.js      # CORSプロキシサーバー
├── package.json       # 依存関係
└── README.md          # このファイル
```

## セットアップ

### 1. 依存関係のインストール
```bash
cd C:\Users\pumpk\xbrl-api-minimal\test-web
npm install
```

### 2. 起動方法

#### 両方のサーバーを同時に起動
```bash
npm start
```

#### 個別に起動
```bash
# HTTPサーバー（ポート8000）
npm run server

# CORSプロキシ（ポート3001）
npm run proxy
```

## アクセス方法
1. ブラウザで http://localhost:8000 を開く
2. 企業名を選択またはクイック選択チップをクリック
3. 「APIテスト実行」ボタンをクリック

## テスト可能な企業
- 株式会社エル・ティー・エス
- 株式会社ダイフク
- 日本瓦斯株式会社
- 株式会社多摩川ホールディングス

## 機能
- **認証タイプ切り替え**: Anon Key / XBRL API Key / 認証なし
- **クイックテスト**: 認証、データ取得、エラー処理、パフォーマンス
- **結果表示**: レスポンス、ヘッダー、統計情報

## CORSプロキシについて
ローカル開発環境でSupabase APIにアクセスするため、CORSプロキシサーバーを使用。
- ポート: 3001
- 転送先: https://wpwqxhyiglbtlaimrjrx.supabase.co

## トラブルシューティング

### ポートが使用中の場合
```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :3001

# プロセスを終了
taskkill /PID <プロセスID> /F
```

### CORSエラーが発生する場合
1. CORSプロキシが起動していることを確認
2. APIエンドポイントが `http://localhost:3001/functions/v1/markdown-reader` になっていることを確認

## スクリーンショット
テスト結果のスクリーンショットは以下に保存されます：
- `C:\Users\pumpk\.playwright-mcp\`

---
最終更新: 2025年1月21日