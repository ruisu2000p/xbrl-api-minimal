# フロントエンド不要ディレクトリ削除リスト

## 🚨 重大な発見
v3.0.0でAPIエンドポイントは削減しましたが、フロントエンドページの多くが残存しています。

## 削除対象ディレクトリ（12個）

| ディレクトリ | 説明 | 理由 |
|------------|------|------|
| `app/admin` | 管理画面 | 管理機能は不要 |
| `app/compliance` | コンプライアンス | 不要なページ |
| `app/dashboard` | ダッシュボード | API削除済み、UI不要 |
| `app/pricing` | 料金ページ | 料金体系なし |
| `app/privacy` | プライバシーポリシー | 静的ページ不要 |
| `app/profile` | プロフィール | ユーザー管理簡素化 |
| `app/sdk` | SDK説明 | ドキュメント重複 |
| `app/security` | セキュリティ | 静的ページ不要 |
| `app/settings` | 設定ページ | 設定機能不要 |
| `app/support` | サポート | サポート機能不要 |
| `app/terms` | 利用規約 | 静的ページ不要 |
| `app/welcome` | ウェルカム | 不要なオンボーディング |

## 維持すべきディレクトリ

| ディレクトリ | 理由 |
|------------|------|
| `app/auth` | 認証機能（必須） |
| `app/api` | APIエンドポイント |
| `app/actions` | サーバーアクション |

## 削除コマンド

```bash
# Windows PowerShell
Remove-Item -Path app\admin -Recurse -Force
Remove-Item -Path app\compliance -Recurse -Force
Remove-Item -Path app\dashboard -Recurse -Force
Remove-Item -Path app\pricing -Recurse -Force
Remove-Item -Path app\privacy -Recurse -Force
Remove-Item -Path app\profile -Recurse -Force
Remove-Item -Path app\sdk -Recurse -Force
Remove-Item -Path app\security -Recurse -Force
Remove-Item -Path app\settings -Recurse -Force
Remove-Item -Path app\support -Recurse -Force
Remove-Item -Path app\terms -Recurse -Force
Remove-Item -Path app\welcome -Recurse -Force
```

## 期待される効果

- **コード削減**: 推定1000行以上
- **ビルドサイズ**: 20-30%削減
- **複雑性**: 大幅削減
- **メンテナンス**: 簡素化

## 追加調査事項

### libディレクトリの不要ファイル
- `lib/utils/cache-system.ts`
- `lib/utils/storage-optimizer.ts`
- `lib/utils/financial-extractor.ts`

### componentsディレクトリ
- `components/ApiUsageStats.tsx`

これらも併せて削除することで、真の最小構成を実現できます。