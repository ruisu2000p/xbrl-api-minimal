# SEO実装チェックリスト

## ✅ 実装完了項目

### 1. 構造化データ (JSON-LD)
- ✅ Organization Schema (全ページ - app/layout.tsx)
- ✅ FAQPage Schema (FAQ セクション - components/FAQSection.tsx)
- ✅ JsonLd コンポーネント (components/JsonLd.tsx)

### 2. Canonical URL
- ✅ Canonicalコンポーネント (components/Canonical.tsx)
- ✅ 全ページに自動設定
- ✅ パラメータ・重複URL対策

### 3. Open Graph / Twitter Card
- ✅ メタデータ設定 (app/layout.tsx)
- ✅ OG画像参照: `/og-image.png` (1200×630px)
- ✅ ロゴ参照: `/logo.png` (512×512px)
- ⚠️ 画像ファイルを `public/` に配置する必要あり

### 4. サイトマップ & Robots
- ✅ sitemap.ts (自動生成、lastModified対応)
- ✅ robots.ts (適切なdisallow設定)

### 5. 内部リンク構造
- ✅ ヘッダー: /, /pricing, /docs, /login, /signup
- ✅ フッター: /privacy, /legal
- ✅ すべて2クリック以内でアクセス可能

## 📋 デプロイ後の確認手順

### 即日チェック (デプロイ直後)

#### 1. リッチリザルトテスト
URL: https://search.google.com/test/rich-results

テスト対象:
- `https://fininfonext.com/` - Organization Schema
- `https://fininfonext.com/#faq` - FAQPage Schema

確認項目:
- [ ] Organization Schema が「有効」
- [ ] FAQPage Schema が「有効」
- [ ] エラー・警告が0件

#### 2. HTMLソース確認
ブラウザの開発者ツールで `<head>` セクションを確認:

```html
<!-- Canonical URL -->
<link rel="canonical" href="https://fininfonext.com/">

<!-- Open Graph -->
<meta property="og:title" content="FIN - XBRL Financial Data Analysis Platform">
<meta property="og:description" content="Access Japanese financial data via XBRL API...">
<meta property="og:image" content="https://fininfonext.com/og-image.png">
<meta property="og:type" content="website">
<meta property="og:url" content="https://fininfonext.com">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="FIN - XBRL Financial Data Analysis Platform">
<meta name="twitter:image" content="https://fininfonext.com/og-image.png">

<!-- JSON-LD Organization -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Financial Information next (FIN)",
  "url": "https://fininfonext.com",
  ...
}
</script>

<!-- JSON-LD FAQPage (FAQセクションのあるページ) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
</script>
```

#### 3. OG画像のプレビュー確認

**Twitter Card Validator:**
- URL: https://cards-dev.twitter.com/validator
- テストURL: `https://fininfonext.com`
- 確認: 1200×630の画像が正しく表示されるか

**Facebook Sharing Debugger:**
- URL: https://developers.facebook.com/tools/debug/
- テストURL: `https://fininfonext.com`
- 確認: OG画像とタイトル・説明が正しく表示されるか

#### 4. Google Search Console - URL検査
重要ページでインデックス登録をリクエスト:
- [ ] https://fininfonext.com/
- [ ] https://fininfonext.com/pricing
- [ ] https://fininfonext.com/signup
- [ ] https://fininfonext.com/docs
- [ ] https://fininfonext.com/login

手順:
1. GSC > URL検査
2. URLを入力
3. 「インデックス登録をリクエスト」をクリック

### 1-2週間後のモニタリング

#### Google Search Console

**検索パフォーマンス:**
- [ ] 表示回数の推移
- [ ] CTRの改善 (目標: 30%+)
- [ ] 平均掲載順位の向上
- [ ] ブランド名クエリのインプレッション

**ページ (インデックス):**
- [ ] インデックス済みページ数 (目標: サイトマップの90%+)
- [ ] 「クロール済み — インデックス未登録」を確認
- [ ] エラーページがないか確認

**構造化データ:**
- [ ] エラー・警告が0件を維持
- [ ] 有効なアイテム数の確認

## 🎨 画像ファイルの配置

### 必要なファイル

1. **OG画像** (1200×630px)
   - ファイル名: `og-image.png`
   - 配置場所: `public/og-image.png`
   - 用途: SNS共有時のプレビュー画像

2. **ロゴ** (512×512px、透過PNG)
   - ファイル名: `logo.png`
   - 配置場所: `public/logo.png`
   - 用途: Organization Schema、ファビコン

### 配置手順

```bash
# ダウンロードした画像を配置
cp /path/to/downloaded/og-image.png public/og-image.png
cp /path/to/downloaded/logo.png public/logo.png

# Git に追加してコミット
git add public/og-image.png public/logo.png
git commit -m "feat: Add OG image and logo for SEO"
git push origin main
```

## 🔧 よくある問題と対処法

### Q: OG画像が表示されない
**A:**
1. ファイルが `public/` に正しく配置されているか確認
2. ファイル名が `og-image.png` (小文字) であることを確認
3. キャッシュクリアが必要な場合がある（Facebook Debuggerで「新しい情報を取得」）

### Q: FAQPage Schema が認識されない
**A:**
1. FAQセクションが実際にページに表示されているか確認
2. JSON-LDの内容が実際のFAQ内容と一致しているか確認
3. 質問・回答にHTMLタグが入っていないか確認（プレーンテキスト推奨）

### Q: Canonical URLが重複している
**A:**
1. `/` と `/index` が両方存在しないか確認
2. パラメータ付きURL (`?ref=xxx`) がcanonicalで統一されているか確認

## 📊 成功KPI (初期目安)

### 4週間以内
- ✅ インデックス済みURL数 = サイトマップ送信URLの **90%以上**
- ✅ 構造化データのエラー **0件**

### 4-8週間
- ✅ ブランド名クエリのCTR **30%以上**
- ✅ 主要LPの平均掲載順位 **上向き傾向**
- ✅ オーガニック流入 **継続的な増加**

## 🚀 次のステップ (オプション)

### 追加の最適化
1. **各ページ専用のOG画像**
   - /pricing 専用の画像
   - /docs 専用の画像
   - ダイナミックOG画像生成

2. **BreadcrumbList Schema**
   - 階層のあるページ（/docs/api など）に実装
   - 検索結果でのパンくず表示

3. **内部リンクの最適化**
   - アンカーテキストを意味のある語に変更
   - 関連ページ同士の相互リンク

4. **パフォーマンス最適化**
   - 画像の最適化（WebP形式）
   - Core Web Vitals の改善

## 📞 サポート

SEO実装に関する質問や追加の最適化が必要な場合は、このドキュメントを参照してください。
