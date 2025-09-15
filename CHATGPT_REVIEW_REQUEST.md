# XBRL API v5.0.0 - システム構成レビュー依頼

## 1. プロジェクト概要

日本の上場企業の有価証券報告書をMarkdown形式で提供するXBRL財務データAPIシステムを、新アーキテクチャ（v5.0.0）にリファクタリングしました。Vercel APIレイヤーを削除し、Supabase Edge Functionsに完全移行しています。

### 主要な変更点
- **旧構成**: Vercel (Frontend + API) → Supabase (DB/Storage)
- **新構成**: Vercel (Frontend only) → Supabase Edge Functions → Supabase (DB/Storage)

## 2. 技術スタック

- **Frontend**: Next.js 14 (App Router) - Vercel でホスティング
- **Backend**: Supabase Edge Functions (Deno Runtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Security**: HMAC-SHA256 APIキー認証、RLSポリシー

## 3. アーキテクチャ変更の理由

1. **パフォーマンス向上**: 不要な中継レイヤーを削除
2. **コスト削減**: Vercel APIの実行時間を削減
3. **セキュリティ強化**: データベースレベルでのRLS実装
4. **メンテナンス性向上**: バックエンドロジックをSupabaseに統合

## 4. 実装したSupabase Edge Functions

### 4.1 search-companies
```typescript
// 企業検索API
// 場所: supabase/functions/search-companies/index.ts
// 機能: 企業名、業種、年度での検索
// 認証: APIキー必須
// レート制限: プランベース

const { data: companies } = await supabase
  .from('companies')
  .select('*')
  .ilike('company_name', `%${query}%`)
  .limit(limit || 10);
```

### 4.2 query-my-data
```typescript
// 汎用データクエリAPI
// 場所: supabase/functions/query-my-data/index.ts
// 機能: markdown_files_metadata, companiesテーブルへの柔軟なクエリ
// セキュリティ: ホワイトリスト方式でテーブル制限

const ALLOWED_TABLES = ['markdown_files_metadata', 'companies'];
```

### 4.3 get-storage-md
```typescript
// Markdownファイル取得API
// 場所: supabase/functions/get-storage-md/index.ts
// 機能: Supabase StorageからMarkdownファイルを取得
// 制限: プランによるファイルサイズ制限（Free: 500KB, Standard: 2MB, Pro: 10MB）
```

## 5. セキュリティ実装

### 5.1 Row Level Security (RLS)
```sql
-- api_keysテーブル: ユーザーは自分のキーのみ操作可能
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- companiesテーブル: 認証済みユーザーまたはAPIキー保持者のみアクセス可能
CREATE POLICY "Authenticated users can view companies" ON companies
  FOR SELECT USING (
    auth.uid() IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE key_hash = current_setting('request.header.x-api-key-hash', true)
      AND status = 'active'
    )
  );
```

### 5.2 APIキー認証
```typescript
// SHA-256ハッシュ化 + HMAC検証
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}
```

## 6. フロントエンドの変更

### DashboardClient.tsx
```typescript
// 旧: Vercel API呼び出し
const response = await fetch('/api/v1/companies');

// 新: Supabase Edge Functions直接呼び出し
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search-companies`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'x-api-key': apiKey
    }
  }
);
```

## 7. レビューポイント

### 7.1 アーキテクチャ設計
- [ ] Supabase Edge Functionsへの完全移行は適切か？
- [ ] RLSポリシーの設計は十分なセキュリティを提供しているか？
- [ ] パフォーマンスボトルネックはないか？

### 7.2 セキュリティ
- [ ] APIキーのハッシュ化方式（SHA-256）は適切か？
- [ ] RLSポリシーに脆弱性はないか？
- [ ] CORSの設定は適切か？

### 7.3 コード品質
- [ ] エラーハンドリングは適切か？
- [ ] TypeScriptの型定義は十分か？
- [ ] レート制限の実装は適切か？

### 7.4 スケーラビリティ
- [ ] 大量のトラフィックに対応できるか？
- [ ] データベースクエリの最適化は十分か？
- [ ] キャッシュ戦略は適切か？

## 8. 懸念事項・質問

1. **Edge Functionsのコールドスタート問題**
   - Deno Runtimeのコールドスタートは許容範囲内か？
   - ウォームアップ戦略は必要か？

2. **RLSのパフォーマンス影響**
   - 複雑なRLSポリシーによるクエリ性能への影響は？
   - インデックス戦略は適切か？

3. **エラーレスポンスの一貫性**
   - Edge FunctionsとSupabase Authのエラーレスポンス形式の統一は必要か？

4. **モニタリング・ロギング**
   - Edge Functionsのログ収集戦略は？
   - パフォーマンスメトリクスの収集方法は？

5. **災害復旧計画**
   - Supabaseに依存度が高くなったが、バックアップ戦略は？
   - フェイルオーバー計画は必要か？

## 9. ベンチマーク要件

以下の観点でパフォーマンステストを実施すべきか検討してください：

- **レスポンスタイム**:
  - 目標: < 200ms (キャッシュヒット時)
  - 現状: 未測定

- **同時接続数**:
  - 目標: 200同時接続
  - 現状: 未測定

- **スループット**:
  - 目標: 1000 req/sec
  - 現状: 未測定

## 10. 今後の改善提案を求めたい点

1. **WebSocket統合**: リアルタイムデータ更新の実装方法
2. **GraphQL導入**: REST APIからの移行の是非
3. **CDNキャッシュ戦略**: Cloudflareとの統合方法
4. **マイクロサービス化**: 機能ごとの分離は必要か？
5. **Kubernetes移行**: 将来的なコンテナ化の検討

## 付録: 主要ファイル一覧

```
xbrl-api-minimal/
├── app/
│   └── dashboard/
│       └── DashboardClient.tsx  # フロントエンド変更箇所
├── supabase/
│   ├── functions/
│   │   ├── search-companies/index.ts
│   │   ├── query-my-data/index.ts
│   │   └── get-storage-md/index.ts
│   └── migrations/
│       └── 20250115_rls_policies.sql  # RLSポリシー定義
├── ARCHITECTURE.md  # 新アーキテクチャ説明書
├── README.md        # v5.0.0更新済み
└── package.json     # v5.0.0更新済み
```

---

以上の内容についてコードレビューとアーキテクチャレビューをお願いします。特にセキュリティ面とパフォーマンス面での改善提案があれば教えてください。