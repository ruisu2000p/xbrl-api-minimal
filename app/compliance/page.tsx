'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CompliancePage() {
  const router = useRouter();

  const certifications = [
    {
      name: 'SOC 2 Type II',
      status: 'compliant',
      description: 'Supabaseインフラストラクチャ準拠',
      details: 'セキュリティ、可用性、処理の完全性、機密性、プライバシーの5つの信頼性原則に基づく監査認証',
    },
    {
      name: 'ISO 27001',
      status: 'compliant',
      description: 'Vercelインフラストラクチャ準拠',
      details: '情報セキュリティマネジメントシステムの国際標準規格',
    },
    {
      name: 'GDPR',
      status: 'compliant',
      description: 'EU一般データ保護規則準拠',
      details: 'EUおよびEEA内の個人データ保護とプライバシーに関する規則',
    },
    {
      name: '個人情報保護法',
      status: 'compliant',
      description: '日本の法令に完全準拠',
      details: '個人情報の適正な取扱いに関する日本の法律',
    },
    {
      name: 'PCI DSS',
      status: 'not-applicable',
      description: '決済情報非保持',
      details: 'クレジットカード情報は一切保存せず、決済代行サービスを利用',
    },
    {
      name: 'HIPAA',
      status: 'not-applicable',
      description: '医療情報非取扱',
      details: '医療・健康情報は取り扱いません',
    },
  ];

  const dataGovernance = [
    {
      title: 'データの収集',
      items: [
        '必要最小限の情報のみ収集',
        '明確な利用目的の提示',
        '事前の同意取得',
        '未成年者からのデータ収集制限',
      ],
    },
    {
      title: 'データの利用',
      items: [
        '同意された目的のみでの利用',
        'プロファイリングの制限',
        '自動意思決定の透明性',
        'データの正確性維持',
      ],
    },
    {
      title: 'データの保管',
      items: [
        '暗号化による保護',
        'アクセス制御の実施',
        '保持期間の明確化',
        '定期的な見直しと削除',
      ],
    },
    {
      title: 'データの共有',
      items: [
        '第三者提供の制限',
        '契約による保護',
        '国際データ転送の管理',
        '共有範囲の最小化',
      ],
    },
  ];

  const userRights = [
    {
      right: 'アクセス権',
      description: '保有する個人データへのアクセスを要求する権利',
      icon: '👁️',
    },
    {
      right: '訂正権',
      description: '不正確な個人データの訂正を要求する権利',
      icon: '✏️',
    },
    {
      right: '削除権',
      description: '個人データの削除を要求する権利（忘れられる権利）',
      icon: '🗑️',
    },
    {
      right: 'データポータビリティ権',
      description: '個人データを機械可読形式で受け取る権利',
      icon: '📦',
    },
    {
      right: '処理制限権',
      description: '個人データの処理を制限する権利',
      icon: '🚫',
    },
    {
      right: '異議申立権',
      description: 'データ処理に対して異議を申し立てる権利',
      icon: '✋',
    },
  ];

  const legalBasis = [
    {
      basis: '契約の履行',
      description: 'サービス提供のために必要なデータ処理',
      examples: ['アカウント作成', 'APIキー発行', 'サービス利用'],
    },
    {
      basis: '法的義務',
      description: '法令遵守のために必要なデータ処理',
      examples: ['税務申告', '法執行機関への対応', '監査対応'],
    },
    {
      basis: '正当な利益',
      description: 'ビジネス運営に必要なデータ処理',
      examples: ['セキュリティ監視', 'サービス改善', '不正利用防止'],
    },
    {
      basis: '同意',
      description: 'お客様の明示的な同意に基づくデータ処理',
      examples: ['マーケティング通信', '新機能のベータテスト', 'アンケート調査'],
    },
  ];

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
              <span className="ml-4 text-gray-500">/ コンプライアンス</span>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ヒーローセクション */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold mb-4">コンプライアンス</h1>
          <p className="text-lg text-gray-600">
            XBRL財務データAPIは、国内外の法規制およびデータ保護基準に準拠し、
            お客様のデータを適切に管理・保護しています。
          </p>
        </div>

        {/* 認証と準拠状況 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">認証と準拠状況</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{cert.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    cert.status === 'compliant' 
                      ? 'bg-green-100 text-green-800' 
                      : cert.status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cert.status === 'compliant' ? '準拠' : cert.status === 'partial' ? '部分準拠' : '非該当'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{cert.description}</p>
                <p className="text-sm text-gray-600">{cert.details}</p>
              </div>
            ))}
          </div>
        </section>

        {/* データガバナンス */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">データガバナンス</h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-gray-600 mb-6">
              データのライフサイクル全体を通じて、適切な管理とガバナンスを実施しています。
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dataGovernance.map((section, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-bold text-lg mb-3">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* データ主体の権利 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">データ主体の権利</h2>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
            <p className="text-gray-700 mb-6">
              GDPRおよび個人情報保護法に基づき、以下の権利を保証します。
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRights.map((right, index) => (
                <div key={index} className="bg-white rounded-lg p-6">
                  <div className="text-3xl mb-3">{right.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{right.right}</h3>
                  <p className="text-sm text-gray-600">{right.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>権利の行使方法：</strong>
                上記の権利を行使される場合は、
                <a href="mailto:privacy@xbrl-api.jp" className="text-blue-600 hover:underline ml-1">
                  privacy@xbrl-api.jp
                </a>
                までご連絡ください。本人確認の上、30日以内に対応いたします。
              </p>
            </div>
          </div>
        </section>

        {/* 法的根拠 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">データ処理の法的根拠</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {legalBasis.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-bold text-lg mb-2">{item.basis}</h3>
                <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">例：</p>
                  <ul className="space-y-1">
                    {item.examples.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 監査と報告 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">監査と報告</h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">定期監査</h3>
                <p className="text-sm text-gray-600">
                  年次で第三者機関による包括的なコンプライアンス監査を実施
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">内部監査</h3>
                <p className="text-sm text-gray-600">
                  四半期ごとの内部コンプライアンスレビューとリスク評価
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">継続的改善</h3>
                <p className="text-sm text-gray-600">
                  監査結果に基づく改善計画の策定と実行
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* データ侵害時の対応 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">データ侵害時の対応</h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-6">
            <h3 className="font-bold text-lg mb-4">インシデント対応プロセス</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h4 className="font-semibold">検知と評価（1時間以内）</h4>
                  <p className="text-sm text-gray-600">インシデントの検知と影響範囲の初期評価</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h4 className="font-semibold">封じ込めと緩和（4時間以内）</h4>
                  <p className="text-sm text-gray-600">被害拡大の防止と一時的な対策の実施</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h4 className="font-semibold">通知（72時間以内）</h4>
                  <p className="text-sm text-gray-600">影響を受けるお客様および規制当局への通知</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold mr-4">4</div>
                <div>
                  <h4 className="font-semibold">調査と改善（継続的）</h4>
                  <p className="text-sm text-gray-600">根本原因の調査と再発防止策の実装</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 国際データ転送 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">国際データ転送</h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-gray-700 mb-6">
              国境を越えたデータ転送について、適切な保護措置を実施しています。
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3">EU/EEAからの転送</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>標準契約条項（SCC）の採用</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>追加的保護措置の実施</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>転送影響評価（TIA）の実施</span>
                  </li>
                </ul>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3">データローカライゼーション</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>日本国内でのデータ保管オプション</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>地域別アクセス制御</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>各国法令への対応</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* お問い合わせ */}
        <section>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">コンプライアンスに関するお問い合わせ</h2>
            <p className="mb-6">
              データ保護、プライバシー、コンプライアンスに関するご質問やご要望がございましたら、
              お気軽にお問い合わせください。
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-bold mb-2">データ保護責任者（DPO）</h3>
                <p className="text-sm">
                  Email: <a href="mailto:dpo@xbrl-api.jp" className="underline">dpo@xbrl-api.jp</a>
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-bold mb-2">コンプライアンスチーム</h3>
                <p className="text-sm">
                  Email: <a href="mailto:compliance@xbrl-api.jp" className="underline">compliance@xbrl-api.jp</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              最終更新日: 2025年1月17日
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