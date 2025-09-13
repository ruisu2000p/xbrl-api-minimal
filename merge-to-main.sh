#!/bin/bash

# MCPセキュリティ更新をmainブランチに統合するスクリプト

echo "🔄 Starting merge process..."

# 1. mainブランチの最新を取得
git checkout main
git pull origin main

# 2. mcp-security-v2ブランチをmainにマージ
echo "📝 Creating merge commit..."
git merge origin/mcp-security-v2 --no-ff -m "feat: Integrate MCP security update v2.0.0

This merge adds the secure MCP server implementation with:
- Environment-based authentication (no more hardcoded keys)
- Rate limiting (100 req/min)
- SQL injection protection
- Path traversal prevention
- Security monitoring and logging
- Migration guide and documentation

All versions prior to 2.0.0 have been deprecated on NPM.
Users must upgrade to address the security vulnerability.

Branch: mcp-security-v2
NPM: shared-supabase-mcp-minimal@2.0.0"

# 3. プッシュ
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Merge complete!"