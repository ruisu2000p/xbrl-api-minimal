# APIエンドポイント整理提案

## 調査概要
- **総エンドポイント数**: 24
- **削除推奨**: 14
- **統合推奨**: 4
- **維持推奨**: 6

## 削除推奨エンドポイント

### 1. 重複エンドポイント
| エンドポイント | 理由 | 代替 |
|--------------|------|------|
| `/api/v1/companies-public` | companiesと機能重複 | `/api/v1/companies` |
| `/api/v1/documents-optimized` | documentsと機能重複 | `/api/v1/documents` |
| `/api/v1/markdown-documents` | markdownと機能重複 | `/api/v1/markdown` |
| `/api/v1/markdown-files` | markdownと機能重複 | `/api/v1/markdown` |

### 2. 未使用エンドポイント
| エンドポイント | 理由 |
|--------------|------|
| `/api/v1/cache` | キャッシュ統計は未使用 |
| `/api/v1/financial-analysis` | MCPで簡略化済み |
| `/api/v1/financial-metrics` | MCPで簡略化済み |
| `/api/dashboard/stats` | 使用ログなし |
| `/api/dashboard/usage` | api_usage_logsテーブル0件 |
| `/api/dashboard/profile` | 未使用 |

### 3. 不要な認証エンドポイント
| エンドポイント | 理由 |
|--------------|------|
| `/api/auth/forgot-password` | パスワードリセット未実装 |
| `/api/auth/reset-password` | パスワードリセット未実装 |
| `/api/auth/delete-account` | アカウント削除機能未使用 |

## 維持推奨エンドポイント

### コア機能
1. `/api/v1/companies` - 企業一覧・検索
2. `/api/v1/documents` - ドキュメント取得
3. `/api/v1/markdown` - Markdownコンテンツ取得
4. `/api/v1/search` - 統合検索
5. `/api/v1/mcp` - MCP統合

### 認証（必須）
1. `/api/auth/login` - ログイン
2. `/api/auth/register` - 新規登録
3. `/api/auth/me` - ユーザー情報

## 実装計画

### フェーズ1: 不要ファイル削除
```bash
# 削除対象ディレクトリ
rm -rf app/api/v1/companies-public
rm -rf app/api/v1/documents-optimized
rm -rf app/api/v1/markdown-documents
rm -rf app/api/v1/markdown-files
rm -rf app/api/v1/cache
rm -rf app/api/v1/financial-analysis
rm -rf app/api/v1/financial-metrics
rm -rf app/api/dashboard
rm -rf app/api/auth/forgot-password
rm -rf app/api/auth/reset-password
rm -rf app/api/auth/delete-account
```

### フェーズ2: 不要ライブラリ削除
```bash
# 削除対象
rm app/api/_lib/logApiUsage.ts
```

### フェーズ3: データベーステーブル削除
```sql
-- 削除対象テーブル
DROP TABLE IF EXISTS api_usage_logs;
DROP TABLE IF EXISTS api_keys; -- 未使用の場合
```

## 期待効果
1. **コードベース削減**: 約40%のAPIコード削減
2. **メンテナンス性向上**: 重複コード削除
3. **パフォーマンス向上**: 不要な処理削除
4. **セキュリティ向上**: 攻撃対象面の削減

## 注意事項
- 削除前にバックアップを作成
- フロントエンドの参照確認が必要
- MCPサーバーとの整合性確認