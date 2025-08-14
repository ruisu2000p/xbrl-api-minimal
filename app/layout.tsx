import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'XBRL財務データAPI - 20年分の有価証券報告書',
  description: '日本の上場企業4,000社以上、20年分の財務データにアクセス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          
          {/* フッター */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* サービス */}
                <div>
                  <h3 className="text-lg font-bold mb-4">サービス</h3>
                  <div className="space-y-2">
                    <Link href="/docs" className="block text-gray-300 hover:text-white transition-colors">
                      APIドキュメント
                    </Link>
                    <Link href="/sdk" className="block text-gray-300 hover:text-white transition-colors">
                      SDK & ライブラリ
                    </Link>
                    <Link href="/examples" className="block text-gray-300 hover:text-white transition-colors">
                      サンプルコード
                    </Link>
                    <Link href="/dashboard" className="block text-gray-300 hover:text-white transition-colors">
                      ダッシュボード
                    </Link>
                  </div>
                </div>

                {/* サポート */}
                <div>
                  <h3 className="text-lg font-bold mb-4">サポート</h3>
                  <div className="space-y-2">
                    <Link href="/support" className="block text-gray-300 hover:text-white transition-colors">
                      ヘルプセンター
                    </Link>
                    <Link href="/support" className="block text-gray-300 hover:text-white transition-colors">
                      お問い合わせ
                    </Link>
                    <Link href="/support#status" className="block text-gray-300 hover:text-white transition-colors">
                      API ステータス
                    </Link>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      コミュニティ
                    </a>
                  </div>
                </div>

                {/* 会社情報 */}
                <div>
                  <h3 className="text-lg font-bold mb-4">会社情報</h3>
                  <div className="space-y-2">
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      会社概要
                    </a>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      採用情報
                    </a>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      ニュース
                    </a>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      パートナー
                    </a>
                  </div>
                </div>

                {/* 法的情報 */}
                <div>
                  <h3 className="text-lg font-bold mb-4">法的情報</h3>
                  <div className="space-y-2">
                    <Link href="/terms" className="block text-gray-300 hover:text-white transition-colors">
                      利用規約
                    </Link>
                    <Link href="/privacy" className="block text-gray-300 hover:text-white transition-colors">
                      プライバシーポリシー
                    </Link>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      セキュリティ
                    </a>
                    <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                      コンプライアンス
                    </a>
                  </div>
                </div>
              </div>

              {/* ボトムセクション */}
              <div className="mt-12 pt-8 border-t border-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="flex items-center mb-4 md:mb-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">X</span>
                    </div>
                    <span className="text-xl font-bold">XBRL Financial Data API</span>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <p className="text-gray-400 text-sm">
                      © 2025 XBRL Financial Data API. All rights reserved.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-400 text-xs text-center">
                    本サービスは、金融庁のEDINETから取得したXBRLデータを活用しています。<br />
                    データの正確性については一切の保証をいたしません。投資判断は自己責任で行ってください。
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}