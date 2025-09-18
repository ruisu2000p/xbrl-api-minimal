# 📁 フォルダ構造改善提案

## 現在の構造の問題点
1. ルートディレクトリに多数のファイルが散在
2. 関連ファイルが別々のフォルダに分散
3. ドキュメントとコードが混在

## 提案する新構造

```
xbrl-api-minimal/
├── 📁 src/                    # ソースコード
│   ├── 📁 app/               # Next.js App Router
│   ├── 📁 components/        # UIコンポーネント
│   ├── 📁 lib/               # ビジネスロジック
│   │   ├── 📁 api/          # API関連
│   │   ├── 📁 auth/         # 認証関連
│   │   ├── 📁 db/           # データベース
│   │   ├── 📁 middleware/   # ミドルウェア
│   │   ├── 📁 security/     # セキュリティ
│   │   └── 📁 utils/        # ユーティリティ
│   ├── 📁 types/            # TypeScript型定義
│   └── 📁 styles/           # スタイル関連
│
├── 📁 infrastructure/         # インフラ・設定
│   ├── 📁 config/           # 設定ファイル
│   ├── 📁 deploy/           # デプロイ設定
│   ├── 📁 scripts/          # ビルド・デプロイスクリプト
│   └── 📁 supabase/         # Supabase設定
│
├── 📁 database/               # データベース関連
│   ├── 📁 migrations/       # マイグレーション
│   ├── 📁 seeds/            # シードデータ
│   └── 📁 sql/              # SQLファイル
│
├── 📁 docs/                   # ドキュメント
│   ├── 📁 api/              # API仕様書
│   ├── 📁 guides/           # ガイド
│   └── 📁 architecture/     # アーキテクチャ文書
│
├── 📁 tests/                  # テスト
│   ├── 📁 unit/             # ユニットテスト
│   ├── 📁 integration/      # 統合テスト
│   └── 📁 e2e/              # E2Eテスト
│
├── 📁 public/                 # 静的ファイル
│
├── 📁 .github/                # GitHub設定
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 next.config.js
├── 📄 README.md
└── 📄 .env.example
```

## 移動計画

### Phase 1: 基本構造の作成
```bash
# srcディレクトリ作成
mkdir -p src/{app,components,lib,types,styles}

# infrastructureディレクトリ作成
mkdir -p infrastructure/{config,deploy,scripts,supabase}

# databaseディレクトリ作成
mkdir -p database/{migrations,seeds,sql}

# testsディレクトリ作成
mkdir -p tests/{unit,integration,e2e}
```

### Phase 2: ファイルの移動

#### コードファイル → src/
- `app/` → `src/app/`
- `components/` → `src/components/`
- `lib/` → `src/lib/`
- `types/` → `src/types/`

#### インフラファイル → infrastructure/
- `config/` → `infrastructure/config/`
- `deploy/` → `infrastructure/deploy/`
- `scripts/` → `infrastructure/scripts/`
- `supabase/` → `infrastructure/supabase/`

#### データベースファイル → database/
- `sql/` → `database/sql/`

### Phase 3: 設定ファイルの更新

#### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/app/*": ["src/app/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

#### next.config.js
```javascript
module.exports = {
  // srcディレクトリをソースとして設定
  experimental: {
    appDir: 'src/app'
  }
}
```

## メリット

1. **明確な責任分離**: コード、インフラ、ドキュメントが明確に分離
2. **保守性向上**: 関連ファイルが同じ場所に集約
3. **スケーラビリティ**: プロジェクト拡大時も構造を維持
4. **開発効率**: ファイルの場所が予測しやすい
5. **CI/CD最適化**: ビルド・デプロイプロセスの簡略化

## 実装順序

1. **バックアップ作成**
2. **新ディレクトリ構造作成**
3. **ファイル移動**
4. **設定ファイル更新**
5. **インポートパス更新**
6. **テスト実行**
7. **コミット・プッシュ**

## 注意事項

- Next.js 13以降のApp Routerは`app/`ディレクトリを認識
- Vercelデプロイ設定の更新が必要な場合あり
- 既存のimportパスをすべて更新する必要あり
- `.gitignore`の更新も必要