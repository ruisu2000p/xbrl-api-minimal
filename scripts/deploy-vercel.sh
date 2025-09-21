#!/bin/bash

# Vercel Deployment Script

echo "🚀 Vercel デプロイメント開始"
echo "================================"

# 環境変数の確認
check_env() {
    local var_name=$1
    if [ -z "${!var_name}" ]; then
        echo "❌ ${var_name} が設定されていません"
        return 1
    else
        echo "✅ ${var_name} 設定済み"
        return 0
    fi
}

echo ""
echo "📋 環境変数チェック:"
check_env "NEXT_PUBLIC_SUPABASE_URL"
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env "SUPABASE_SERVICE_ROLE_KEY"
check_env "API_KEY_SECRET"

echo ""
echo "🏗️  ビルドテスト実行中..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド成功"
else
    echo "❌ ビルドに失敗しました"
    exit 1
fi

echo ""
echo "🚀 Vercelへのデプロイ"
echo "================================"

# プロダクション環境へデプロイ
if [ "$1" == "production" ]; then
    echo "📦 本番環境へデプロイ中..."
    vercel --prod
else
    echo "📦 プレビュー環境へデプロイ中..."
    vercel
fi

echo ""
echo "✨ デプロイ完了！"