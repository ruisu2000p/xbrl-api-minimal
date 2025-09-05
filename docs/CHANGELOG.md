# Changelog

## [1.1.0] - 2025-09-01

### 🎉 新機能
- **Markdown Documents API** - `markdown_files_metadata`テーブルを活用した新しいAPIエンドポイント
  - `GET /api/v1/markdown-documents` - メタデータ検索とファイル取得
  - `POST /api/v1/markdown-documents` - 企業別の一括ドキュメント取得
  - Supabase Storageからの直接ファイル取得に対応

### 🐛 バグ修正
- ストレージパスの修正（`markdown-files/`プレフィックスの自動削除）
- 日本語検索のURLエンコーディング問題を解決
- Service Roleキーによる認証処理の改善

### 📝 ドキュメント
- `docs/markdown-documents-api.md` - 新APIの詳細仕様書を追加
- `SETUP_WPWQ_PROJECT.md` - wpwqxhyiglbtlaimrjrxプロジェクトセットアップガイド

### 🔧 スクリプト
- `scripts/analyze-markdown-metadata.js` - メタデータ分析ツール
- `scripts/update-markdown-metadata-names.js` - company_name更新ツール
- `scripts/analyze-unmatched-records.js` - ID不一致分析ツール
- `scripts/debug-storage-access.js` - ストレージアクセスデバッグツール
- `scripts/fix-storage-paths.js` - パス修正ツール
- テストスクリプト群の追加

### 📊 データ
- 101,983件のmarkdown_files_metadataレコードに対応
- FY2015〜FY2024の財務データアクセス
- 亀田製菓など16,291社のcompany_name設定済み

### 🔄 改善
- APIパラメータの互換性向上（query/search、industry/sector）
- エラーハンドリングの強化
- パフォーマンスの最適化

## [1.0.0] - 2025-08-31

### 初回リリース
- 基本的なAPIエンドポイント実装
- Supabase統合
- 認証システム
- MCP Server対応