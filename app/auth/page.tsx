import AuthDisplay from '../../components/AuthDisplay';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            認証・JWT管理
          </h1>
          <p className="text-lg text-gray-600">
            JWTトークンの表示・管理とXBRL APIの認証テストを行えます
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <AuthDisplay />
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            JWT-first認証について
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              このシステムでは<strong>JWT必須 + x-api-key併用</strong>の認証方式を採用しています：
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>JWT Token</strong>: 必須。<code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;jwt&gt;</code>ヘッダーで送信
              </li>
              <li>
                <strong>API Key</strong>: 任意。<code className="bg-gray-100 px-1 rounded">x-api-key: xbrl_v1_xxx</code>ヘッダーで送信
              </li>
              <li>
                APIキーをAuthorizationヘッダーに入れる誤用は完全に拒否されます
              </li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">API使用例</h3>
            <pre className="text-sm text-blue-800 bg-blue-100 p-3 rounded overflow-x-auto">
{`// JWT のみ（基本）
curl -H "Authorization: Bearer <your-jwt>" \\
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-public/companies"

// JWT + API Key（拡張）
curl -H "Authorization: Bearer <your-jwt>" \\
     -H "x-api-key: xbrl_v1_xxx" \\
  "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-public/companies"`}
            </pre>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            利用可能なエンドポイント
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">GET /companies</h3>
              <p className="text-sm text-gray-600">企業検索（query パラメータ優先）</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">GET /markdown-files</h3>
              <p className="text-sm text-gray-600">ファイル検索（query パラメータ優先）</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">GET /search</h3>
              <p className="text-sm text-gray-600">サマリ検索（会社×年度の件数集計）</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}