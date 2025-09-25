export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">
          XBRL Financial Data API
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          財務データ分析システム
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">📊 データ検索</h2>
            <p className="text-gray-600">
              企業名や証券コードで財務データを簡単に検索
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">🔒 セキュアAPI</h2>
            <p className="text-gray-600">
              JWT認証とAPIキーによる安全なデータアクセス
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">📈 分析ツール</h2>
            <p className="text-gray-600">
              財務データの可視化と分析機能
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="/api/docs"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            API Documentation
          </a>
        </div>
      </div>
    </main>
  )
}