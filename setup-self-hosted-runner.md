# GitHub Actions セルフホストランナー設定手順

## 1. ランナーのダウンロードと設定

### Windows環境でのセットアップ

1. **作業ディレクトリの作成**
```powershell
mkdir C:\Users\pumpk\github-runner
cd C:\Users\pumpk\github-runner
```

2. **ランナーのダウンロード**
```powershell
# PowerShellで実行
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-win-x64-2.321.0.zip -OutFile actions-runner-win-x64-2.321.0.zip
```

3. **ファイルの展開**
```powershell
# PowerShellで実行（管理者権限不要）
Expand-Archive -Path actions-runner-win-x64-2.321.0.zip -DestinationPath .
```

4. **ランナーの設定**
```powershell
# コマンドプロンプトまたはPowerShellで実行
./config.cmd --url https://github.com/ruisu2000p/xbrl-api-minimal --token BHOSBSTKADKXGAJRFSWQY63HU6KJA
```

設定時の質問への回答：
- Runner group: `Default` (Enterキー)
- Runner name: `windows-runner` または任意の名前
- Runner labels: `self-hosted,Windows,X64` (デフォルト)
- Work folder: `_work` (デフォルト)

5. **ランナーの起動**

**方法1: インタラクティブに実行（テスト用）**
```powershell
./run.cmd
```

**方法2: Windowsサービスとして実行（本番用）**
```powershell
# 管理者権限のPowerShellで実行
./svc.sh install
./svc.sh start
```

## 2. ワークフローファイルの設定

### オプション1: セルフホストランナー専用設定

`.github/workflows/node.js-self-hosted.yml` を作成：

```yaml
name: Node.js CI (Self-Hosted)

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:  # 手動実行を許可

jobs:
  build:
    runs-on: self-hosted  # セルフホストランナーを使用

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build --if-present

    - name: Test
      run: npm test
      env:
        NODE_ENV: test
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co' }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key' }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key' }}
```

### オプション2: ハイブリッド設定（GitHubホストとセルフホストの両方）

既存の `.github/workflows/node.js.yml` を更新：

```yaml
name: Node.js CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-github-hosted:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test
      env:
        NODE_ENV: test
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co' }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key' }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key' }}

  build-self-hosted:
    runs-on: self-hosted

    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test
      env:
        NODE_ENV: test
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co' }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key' }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key' }}
```

## 3. セキュリティ考慮事項

### 重要な注意点

1. **プライベートリポジトリでの使用推奨**
   - パブリックリポジトリでのセルフホストランナーの使用は、セキュリティリスクがあります
   - フォークからのPRが悪意のあるコードを実行する可能性があります

2. **環境の隔離**
   - 本番環境とは別のマシンでランナーを実行
   - 仮想マシンやコンテナの使用を検討

3. **アクセス制御**
   - ランナーへのアクセスを制限
   - 必要最小限の権限のみ付与

## 4. トラブルシューティング

### ランナーが認識されない場合
```powershell
# ランナーのステータス確認
./config.cmd remove --token BHOSBSTKADKXGAJRFSWQY63HU6KJA
./config.cmd --url https://github.com/ruisu2000p/xbrl-api-minimal --token BHOSBSTKADKXGAJRFSWQY63HU6KJA
```

### Node.jsが見つからない場合
```powershell
# Node.jsのパスを確認
where node
# 環境変数PATHにNode.jsのパスが含まれているか確認
echo $env:PATH
```

### ポート競合エラー
```powershell
# 使用中のポートを確認
netstat -ano | findstr :3000
# 必要に応じてプロセスを終了
taskkill /PID <プロセスID> /F
```

## 5. メンテナンス

### ランナーの更新
GitHubがランナーの更新を通知した場合：
```powershell
# ランナーを停止
./svc.sh stop
# 新しいバージョンをダウンロードして展開
# 設定を再実行
./config.cmd --url https://github.com/ruisu2000p/xbrl-api-minimal --token <新しいトークン>
# サービスを再開
./svc.sh start
```

### ログの確認
```powershell
# ランナーのログファイル確認
Get-Content _diag\Runner_*.log -Tail 50
# ワーカーのログ確認
Get-Content _diag\Worker_*.log -Tail 50
```

## 6. 推奨事項

1. **定期的なメンテナンス**
   - ランナーソフトウェアの更新
   - ログファイルのローテーション
   - ディスクスペースの監視

2. **監視**
   - ランナーのステータス監視
   - ジョブの実行時間監視
   - リソース使用量の監視

3. **バックアップ**
   - ランナー設定のバックアップ
   - 環境変数の記録

## 参考リンク
- [GitHub Actions セルフホストランナー公式ドキュメント](https://docs.github.com/en/actions/hosting-your-own-runners)
- [セキュリティ強化のベストプラクティス](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#self-hosted-runner-security)