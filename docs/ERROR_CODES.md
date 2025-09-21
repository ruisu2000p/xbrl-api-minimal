# エラーコードリファレンス

## 概要

XBRL API Minimalでは統一されたエラーコード体系を使用しています。すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人が読めるエラーメッセージ",
    "details": "追加の詳細情報（オプション）",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## エラーコード一覧

### 認証・認可エラー (4xx)

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `AUTH_MISSING_KEY` | 401 | APIキーが提供されていない | リクエストヘッダーに `X-API-Key` を含める |
| `AUTH_INVALID_KEY` | 401 | 無効なAPIキー | 正しいAPIキーを使用する |
| `AUTH_KEY_EXPIRED` | 401 | 有効期限切れのAPIキー | 新しいAPIキーを取得する |
| `AUTH_KEY_REVOKED` | 401 | 取り消されたAPIキー | 新しいAPIキーを取得する |
| `AUTH_KEY_SUSPENDED` | 401 | 一時停止中のAPIキー | サポートに問い合わせる |
| `AUTH_INSUFFICIENT_TIER` | 403 | ティアが不十分 | 上位プランへアップグレード |
| `AUTH_INVALID_FORMAT` | 400 | APIキーの形式が無効 | 正しい形式のAPIキーを使用 |
| `AUTH_HMAC_INVALID` | 401 | HMAC検証失敗 | APIキーが改ざんされていないか確認 |
| `AUTH_KEY_NOT_FOUND` | 404 | APIキーが存在しない | 正しいAPIキーを確認 |

### レート制限エラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 | `Retry-After` ヘッダーの時間待機 |
| `RATE_LIMIT_QUOTA` | 429 | 月間クォータ超過 | 翌月まで待つかプランアップグレード |
| `RATE_LIMIT_CONCURRENT` | 429 | 同時リクエスト数超過 | 同時リクエスト数を減らす |

### バリデーションエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `VALIDATION_INVALID_INPUT` | 400 | 無効な入力値 | 入力パラメータを確認 |
| `VALIDATION_MISSING_FIELD` | 400 | 必須フィールド不足 | 必須フィールドを含める |
| `VALIDATION_TYPE_ERROR` | 400 | 型エラー | 正しい型の値を送信 |
| `VALIDATION_RANGE_ERROR` | 400 | 範囲外の値 | 許容範囲内の値を使用 |
| `VALIDATION_FORMAT_ERROR` | 400 | フォーマットエラー | 正しいフォーマットで送信 |
| `VALIDATION_SQL_INJECTION` | 400 | SQLインジェクション検出 | 特殊文字を避ける |
| `VALIDATION_XSS_DETECTED` | 400 | XSS攻撃検出 | HTMLタグやスクリプトを除去 |
| `VALIDATION_PATH_TRAVERSAL` | 400 | パストラバーサル検出 | 相対パスを使用しない |

### リソースエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない | リソースIDを確認 |
| `RESOURCE_ALREADY_EXISTS` | 409 | リソースが既に存在 | 別のIDを使用 |
| `RESOURCE_CONFLICT` | 409 | リソースの競合 | 操作を再試行 |
| `RESOURCE_LOCKED` | 423 | リソースがロック中 | しばらく待って再試行 |
| `RESOURCE_DELETED` | 410 | リソースが削除済み | - |

### データベースエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `DB_CONNECTION_ERROR` | 503 | データベース接続エラー | しばらく待って再試行 |
| `DB_QUERY_ERROR` | 500 | クエリ実行エラー | サポートに報告 |
| `DB_TRANSACTION_ERROR` | 500 | トランザクションエラー | 再試行 |
| `DB_TIMEOUT` | 504 | データベースタイムアウト | クエリを簡略化 |
| `DB_DEADLOCK` | 503 | デッドロック検出 | 再試行 |

### ビジネスロジックエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `BUSINESS_RULE_VIOLATION` | 422 | ビジネスルール違反 | 操作の前提条件を確認 |
| `BUSINESS_INVALID_STATE` | 422 | 無効な状態遷移 | 現在の状態を確認 |
| `BUSINESS_LIMIT_REACHED` | 422 | ビジネス上の制限到達 | 制限を確認 |
| `BUSINESS_NOT_ALLOWED` | 403 | 操作が許可されていない | 権限を確認 |

### 外部サービスエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `EXTERNAL_SERVICE_ERROR` | 502 | 外部サービスエラー | しばらく待って再試行 |
| `EXTERNAL_TIMEOUT` | 504 | 外部サービスタイムアウト | しばらく待って再試行 |
| `EXTERNAL_UNAVAILABLE` | 503 | 外部サービス利用不可 | ステータスページを確認 |

### システムエラー

| コード | HTTPステータス | 説明 | 対処法 |
|-------|--------------|------|--------|
| `INTERNAL_ERROR` | 500 | 内部エラー | サポートに報告 |
| `INTERNAL_CONFIG_ERROR` | 500 | 設定エラー | サポートに報告 |
| `INTERNAL_CRITICAL` | 500 | クリティカルエラー | 緊急でサポートに報告 |
| `SERVICE_UNAVAILABLE` | 503 | サービス利用不可 | メンテナンス情報を確認 |
| `SERVICE_OVERLOADED` | 503 | サービス過負荷 | しばらく待って再試行 |

## HTTPステータスコードとの対応

| ステータスコード | 説明 | 主なエラーコード |
|-----------------|------|-----------------|
| 400 | Bad Request | `VALIDATION_*`, `AUTH_INVALID_FORMAT` |
| 401 | Unauthorized | `AUTH_MISSING_KEY`, `AUTH_INVALID_KEY` |
| 403 | Forbidden | `AUTH_INSUFFICIENT_TIER`, `BUSINESS_NOT_ALLOWED` |
| 404 | Not Found | `RESOURCE_NOT_FOUND`, `AUTH_KEY_NOT_FOUND` |
| 409 | Conflict | `RESOURCE_ALREADY_EXISTS`, `RESOURCE_CONFLICT` |
| 410 | Gone | `RESOURCE_DELETED` |
| 422 | Unprocessable Entity | `BUSINESS_*` |
| 423 | Locked | `RESOURCE_LOCKED` |
| 429 | Too Many Requests | `RATE_LIMIT_*` |
| 500 | Internal Server Error | `INTERNAL_*`, `DB_QUERY_ERROR` |
| 502 | Bad Gateway | `EXTERNAL_SERVICE_ERROR` |
| 503 | Service Unavailable | `SERVICE_*`, `DB_CONNECTION_ERROR` |
| 504 | Gateway Timeout | `DB_TIMEOUT`, `EXTERNAL_TIMEOUT` |

## エラー処理のベストプラクティス

### クライアント側の実装例

```javascript
async function apiRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const error = await response.json();

      switch (error.error.code) {
        case 'RATE_LIMIT_EXCEEDED':
          // Retry-Afterヘッダーを確認して再試行
          const retryAfter = response.headers.get('Retry-After');
          await sleep(retryAfter * 1000);
          return apiRequest(endpoint, options);

        case 'AUTH_INVALID_KEY':
          // APIキーを再取得
          await refreshApiKey();
          return apiRequest(endpoint, options);

        default:
          throw new ApiError(error.error);
      }
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

### エラーのログ記録

すべてのエラーには以下の情報が含まれます：

- `code`: エラーコード
- `message`: 人が読めるメッセージ（センシティブ情報は自動的にマスク）
- `timestamp`: エラー発生時刻
- `requestId`: リクエスト追跡用ID（ヘッダーに含まれる）

### セキュリティ考慮事項

1. **センシティブ情報の保護**: APIキー、パスワード、個人情報などは自動的にマスクされます
2. **エラーの詳細度**: 本番環境では詳細なスタックトレースは返されません
3. **レート制限**: セキュリティ関連のエラーには追加のレート制限が適用されます

## サポート

エラーが解決しない場合は、以下の情報と共にサポートにお問い合わせください：

- エラーコード
- リクエストID（レスポンスヘッダーの `X-Request-ID`）
- 発生時刻
- 実行した操作の詳細

---

最終更新: 2024年12月
バージョン: 1.0.0