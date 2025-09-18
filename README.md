# FIN - Financial Information next

シンプルなNext.js製ランディングサイトです。FINが提供する財務データAPIの特徴や料金プランを紹介し、デモンストレーションを通して利用イメージを伝えます。

## 🚀 セットアップ

```bash
npm install
npm run dev
```

- 開発サーバー: http://localhost:3000
- ビルド: `npm run build`
- Lint: `npm run lint`
- 型チェック: `npm run type-check`

## 🧱 主な構成

```
xbrl-api-minimal/
├── app/            # Next.js App Router エントリ
│   ├── layout.tsx  # 共通レイアウト
│   └── page.tsx    # ランディングページ
├── components/     # UI コンポーネント
│   ├── Header.tsx
│   ├── HeroSection.tsx
│   ├── SearchDemo.tsx
│   ├── FeaturesSection.tsx
│   ├── PricingSection.tsx
│   ├── FAQSection.tsx
│   └── Footer.tsx
├── public/         # 静的アセット
└── tailwind.config.js
```

## ✨ セクション概要

- **Hero**: ブランドメッセージと主要なCTAを配置。
- **Interactive Demo**: APIレスポンスのイメージを再現する擬似チャットUI。
- **Features**: 財務データAPIの特徴をカード形式で紹介。
- **Pricing**: フリーミアムとスタンダードの2プランを掲載。
- **FAQ**: よくある質問をアコーディオンで表示。

## 🛠 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

## 📄 ライセンス

MIT
