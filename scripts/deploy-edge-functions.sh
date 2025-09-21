#!/bin/bash

# Supabase Edge Functions デプロイスクリプト

echo "==================================="
echo "Supabase Edge Functions Deployment"
echo "==================================="

# プロジェクトIDの確認
PROJECT_ID="wpwqxhyiglbtlaimrjrx"
echo "Project ID: $PROJECT_ID"

# Edge Functionsのリスト
FUNCTIONS=(
  "search-companies"
  "query-my-data"
  "get-storage-md"
  "keys_issue"
  "keys_issue_standalone"
)

# 各関数をデプロイ
for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "Deploying function: $func"
  echo "------------------------"

  supabase functions deploy $func --project-ref $PROJECT_ID

  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
    exit 1
  fi
done

echo ""
echo "==================================="
echo "All functions deployed successfully!"
echo "==================================="

# Edge Functions URLの表示
echo ""
echo "Edge Functions URLs:"
echo "-------------------"
for func in "${FUNCTIONS[@]}"; do
  echo "https://$PROJECT_ID.supabase.co/functions/v1/$func"
done

echo ""
echo "Done!"