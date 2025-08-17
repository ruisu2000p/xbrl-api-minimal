'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                XBRL財務データAPI
              </Link>
              <span className="ml-4 text-gray-500">/ セキュリティ</span>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">セキュリティ</h1>
          
          {/* セキュリティ概要 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">エンタープライズグレードのセキュリティ</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <p className="text-gray-700 mb-6">
                XBRL財務データAPIは、金融業界標準のセキュリティプラクティスを採用し、
                お客様の重要な財務データを保護します。多層防御アプローチにより、
                データの機密性、完全性、可用性を確保しています。
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600">99.99%</div>
                  <div className="text-sm text-gray-600">稼働率保証</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">AES-256</div>
                  <div className="text-sm text-gray-600">暗号化強度</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-3xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">セキュリティ監視</div>
                </div>
              </div>
            </div>
          </section>

          {/* データ暗号化 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">データ暗号化</h2>
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">転送時の暗号化</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>TLS 1.3による全通信の暗号化</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>HSTS (HTTP Strict Transport Security) 有効</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Perfect Forward Secrecy対応</span>
                  </li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">保存時の暗号化</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>AES-256によるデータ暗号化</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>バックアップの暗号化</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>90日ごとの暗号鍵ローテーション</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 認証とアクセス制御 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">認証とアクセス制御</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">API認証</h3>
                <ul className="space-y-2">
                  <li>• SHA-256によるAPIキーハッシュ化</li>
                  <li>• Bearer Token方式</li>
                  <li>• 1年間の有効期限</li>
                  <li>• 自動失効機能</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">レート制限</h3>
                <ul className="space-y-2">
                  <li>• Free: 100回/分</li>
                  <li>• Standard: 500回/分</li>
                  <li>• Pro: 1,000回/分</li>
                  <li>• Enterprise: カスタム</li>
                </ul>
              </div>
            </div>
          </section>

          {/* インフラストラクチャ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">インフラストラクチャセキュリティ</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                <h3 className="font-bold text-lg mb-4">Vercel Infrastructure</h3>
                <ul className="space-y-2 text-sm">
                  <li>• エッジネットワーク (全世界70+拠点)</li>
                  <li>• DDoS保護 (Cloudflare統合)</li>
                  <li>• 自動スケーリング</li>
                  <li>• ISO 27001認証取得</li>
                </ul>
              </div>
              <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                <h3 className="font-bold text-lg mb-4">Supabase Infrastructure</h3>
                <ul className="space-y-2 text-sm">
                  <li>• AWS上での運用</li>
                  <li>• マルチリージョン対応</li>
                  <li>• 自動バックアップ (日次)</li>
                  <li>• SOC 2 Type II準拠</li>
                </ul>
              </div>
            </div>
          </section>

          {/* コンプライアンス */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">コンプライアンス</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">SOC 2 Type II</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">準拠</span>
                </div>
                <p className="text-sm text-gray-600">Supabase インフラ準拠</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">ISO 27001</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">準拠</span>
                </div>
                <p className="text-sm text-gray-600">Vercel インフラ準拠</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">GDPR</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">準拠</span>
                </div>
                <p className="text-sm text-gray-600">EU一般データ保護規則準拠</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">個人情報保護法</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">準拠</span>
                </div>
                <p className="text-sm text-gray-600">日本の法令準拠</p>
              </div>
            </div>
          </section>

          {/* インシデント対応 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">監視とインシデント対応</h2>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-8">
              <h3 className="font-bold text-lg mb-4">24/7 セキュリティオペレーションセンター</h3>
              <p className="text-gray-700 mb-4">
                専門のセキュリティチームが24時間365日体制でシステムを監視し、
                潜在的な脅威の検出と対応を行っています。
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">5分以内</div>
                  <div className="text-sm text-gray-600">平均検知時間</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">30分以内</div>
                  <div className="text-sm text-gray-600">初動対応時間</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">4時間以内</div>
                  <div className="text-sm text-gray-600">封じ込め時間</div>
                </div>
              </div>
            </div>
          </section>

          {/* データプライバシー */}
          <section>
            <h2 className="text-2xl font-bold mb-6">データプライバシー</h2>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
              <h3 className="font-bold text-lg mb-4">プライバシーファースト設計</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>必要最小限のデータ収集</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>明確な同意取得</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>データ削除権の保証</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>第三者提供の制限</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              セキュリティに関するご質問は{' '}
              <a href="mailto:security@xbrl-api.jp" className="text-blue-400 hover:text-blue-300">
                security@xbrl-api.jp
              </a>{' '}
              までお問い合わせください。
            </p>
            <p className="text-xs mt-2">
              &copy; 2025 XBRL Financial Data API. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}