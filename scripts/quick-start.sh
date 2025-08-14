#!/bin/bash

echo "🚀 XBRL財務データAPI - クイックスタートスクリプト"
echo "================================================"
echo ""

# Node.jsチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.jsがインストールされていません"
    echo "👉 https://nodejs.org/ からインストールしてください"
    exit 1
fi

echo "✅ Node.js $(node -v) を検出"

# npmインストール
echo ""
echo "📦 依存関係をインストール中..."
npm install

# 環境変数ファイル作成
if [ ! -f .env.local ]; then
    echo ""
    echo "🔧 環境変数ファイルを作成中..."
    cp .env.example .env.local
    echo "✅ .env.local を作成しました"
    echo ""
    echo "⚠️  重要: .env.local を編集して以下の値を設定してください:"
    echo "   1. Supabase の認証情報"
    echo "   2. Stripe の APIキー（オプション）"
    echo "   3. Backblaze B2 の認証情報（オプション）"
else
    echo "✅ .env.local は既に存在します"
fi

echo ""
echo "📝 Supabaseセットアップ手順:"
echo "   1. https://supabase.com で無料アカウントを作成"
echo "   2. 新しいプロジェクトを作成"
echo "   3. SQL Editor で supabase/schema.sql を実行"
echo "   4. Settings → API から認証情報をコピー"

echo ""
echo "🎉 セットアップ完了!"
echo ""
echo "次のステップ:"
echo "   1. .env.local を編集"
echo "   2. npm run dev でローカル起動"
echo "   3. http://localhost:3000 でアクセス"
echo ""
echo "デプロイ方法:"
echo "   vercel コマンドでVercelにデプロイ（無料）"