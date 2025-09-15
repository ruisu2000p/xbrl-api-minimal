'use client';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white py-16 relative">
      <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">X</span>
              </div>
              <h5 className="font-bold text-2xl">XBRL Financial API</h5>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              日本の上場企業5,220社の財務データを提供する<br />
              プロフェッショナルAPIサービス
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="https://github.com" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h6 className="font-semibold mb-4 text-gray-300">サービス</h6>
            <ul className="space-y-2 text-sm">
              <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">ダッシュボード</a></li>
              <li><a href="/api-docs" className="text-gray-400 hover:text-white transition-colors">API ドキュメント</a></li>
              <li><a href="/pricing" className="text-gray-400 hover:text-white transition-colors">料金プラン</a></li>
              <li><a href="/support" className="text-gray-400 hover:text-white transition-colors">サポート</a></li>
            </ul>
          </div>

          <div>
            <h6 className="font-semibold mb-4 text-gray-300">法的情報</h6>
            <ul className="space-y-2 text-sm">
              <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors">利用規約</a></li>
              <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">プライバシーポリシー</a></li>
              <li><a href="/security" className="text-gray-400 hover:text-white transition-colors">セキュリティ</a></li>
              <li><a href="/compliance" className="text-gray-400 hover:text-white transition-colors">コンプライアンス</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © 2025 XBRL Financial Data API. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">API Status: Operational</span>
            </div>
            <a href="/status" className="text-sm text-gray-400 hover:text-white transition-colors">
              システムステータス
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}