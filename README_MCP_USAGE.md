# XBRL Financial Data MCP - 使用方法

## 🚀 セットアップ完了！

MCPサーバーがClaude Desktopで利用可能になりました。

## 📋 前提条件

1. **Express APIサーバーが起動中** (http://localhost:5001)
   ```bash
   cd C:\Users\pumpk\Downloads\xbrl-api-minimal
   node express-server.js
   ```

2. **Claude Desktopが設定済み**
   - 設定ファイル: `%APPDATA%\Claude\claude_desktop_config.json`
   - MCPサーバー名: `xbrl-financial`

## 🎯 使用方法

### Claude Desktopを再起動

1. Claude Desktopを完全に終了
2. Claude Desktopを再起動
3. MCPが自動的に読み込まれます

### 利用可能なコマンド例

Claude Desktopで以下のような質問ができます：

#### 1. 企業のファイル一覧を取得
```
「企業ID S100LJ4Fの2021年の有価証券報告書のファイル一覧を見せてください」
```

#### 2. 特定セクションの内容を取得
```
「企業ID S100LJ4Fの企業概況を見せてください」
「企業ID S100LJ4Fのファイル番号1の内容を表示してください」
```

#### 3. 財務概要の取得
```
「企業ID S100LJ4Fの2021年の財務概要を教えてください」
```

## 📊 利用可能な企業ID例

以下は実際にデータが存在する企業IDの例です：

- **S100LJ4F** - 亀田製菓株式会社
- **S100LJ5C** - エスフーズ株式会社  
- **S100LJ64** - 三菱電機株式会社
- **S100LJ65** - 富士電機株式会社
- **S100LIPB** - 積水化学工業株式会社

## 🔧 トラブルシューティング

### MCPが認識されない場合

1. Claude Desktopを完全に終了（タスクマネージャーで確認）
2. 設定ファイルを確認：
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```
3. APIサーバーが起動していることを確認：
   ```bash
   curl http://localhost:5001/api/test
   ```

### エラーが発生する場合

1. APIサーバーのログを確認
2. MCPサーバーを手動でテスト：
   ```bash
   cd C:\Users\pumpk\Downloads\xbrl-api-minimal
   node mcp/server-fixed.js
   ```

## 📝 技術詳細

### MCPツール

1. **get_company_files**
   - 企業の有価証券報告書ファイル一覧を取得
   - パラメータ: company_id (必須), year (オプション、デフォルト: 2021)

2. **get_file_content**
   - 特定ファイルの内容を取得
   - パラメータ: company_id (必須), file_index (必須), year (オプション)

3. **get_financial_overview**
   - 企業の財務概要を取得
   - パラメータ: company_id (必須), year (オプション)

### データ構造

```
Supabase Storage
└── markdown-files/
    ├── 2021/
    │   └── S100LJ4F/
    │       ├── 0000000_表紙.md
    │       ├── 0101010_企業の概況.md
    │       ├── 0102010_事業の状況.md
    │       └── ... (10-25ファイル)
    └── 2022/
        └── S100LJ4F/
            └── ... (同様の構造)
```

## 🎉 利用開始！

Claude Desktopを再起動して、日本企業の財務データにアクセスしてみましょう！

例：「企業ID S100LJ4Fの2021年の有価証券報告書を分析してください」

---

問題が発生した場合は、以下を確認してください：
1. APIサーバーが起動中 (http://localhost:5001)
2. Claude Desktopが最新版
3. 設定ファイルが正しく配置されている