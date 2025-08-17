'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SecurityPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'セキュリティ概要', icon: '🔒' },
    { id: 'encryption', title: 'データ暗号化', icon: '🔐' },
    { id: 'authentication', title: '認証とアクセス制御', icon: '🔑' },
    { id: 'infrastructure', title: 'インフラセキュリティ', icon: '🏰' },
    { id: 'compliance', title: 'コンプライアンス', icon: '📋' },
    { id: 'monitoring', title: '監視とインシデント対応', icon: '👁️' },
    { id: 'vulnerability', title: '脆弱性管理', icon: '🛡️' },
    { id: 'data-privacy', title: 'データプライバシー', icon: '🔏' },
  ];

  const certifications = [
    { name: 'SOC 2 Type II', status: 'compliant', description: 'Supabase インフラ準拠' },
    { name: 'ISO 27001', status: 'compliant', description: 'Vercel インフラ準拠' },
    { name: 'GDPR', status: 'compliant', description: 'EU一般データ保護規則準拠' },
    { name: 'PCI DSS', status: 'partial', description: '決済情報非保持' },
  ];

  const securityFeatures = [
    {
      category: '通信セキュリティ',
      features: [
        'TLS 1.3による全通信の暗号化',
        'HSTS (HTTP Strict Transport Security) 有効',
        'Perfect Forward Secrecy対応',
        'Certificate Transparency対応',
      ],
    },
    {
      category: 'データ保護',
      features: [
        'AES-256によるデータ暗号化',
        'バックアップの暗号化',
        'Row Level Security (RLS) 実装',
        'データマスキング機能',
      ],
    },
    {
      category: 'アクセス制御',
      features: [
        'SHA-256によるAPIキーハッシュ化',
        'レート制限（100req/分、10,000req/時）',
        'IP許可リスト（エンタープライズプラン）',
        'ロールベースアクセス制御（RBAC）',
      ],
    },
    {
      category: '監視・検知',
      features: [
        '24/7セキュリティモニタリング',
        '異常検知システム',
        'リアルタイムアラート',
        '詳細な監査ログ',
      ],
    },
  ];

  const incidentResponse = [
    { phase: '検知', time: '< 5分', description: '自動監視システムによる異常検知' },
    { phase: '評価', time: '< 30分', description: 'セキュリティチームによる影響評価' },
    { phase: '封じ込め', time: '< 1時間', description: '被害拡大防止措置の実施' },
    { phase: '根絶', time: '< 4時間', description: '脅威の完全除去' },
    { phase: '復旧', time: '< 24時間', description: 'サービス正常化' },
    { phase: '改善', time: '< 72時間', description: '再発防止策の実装' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4">エンタープライズグレードのセキュリティ</h2>
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

            <div>
              <h3 className="text-xl font-bold mb-4">セキュリティ機能一覧</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {securityFeatures.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-bold text-lg mb-3 text-blue-600">{item.category}</h4>
                    <ul className="space-y-2">
                      {item.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'encryption':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">データ暗号化</h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
                <h3 className="font-bold text-lg mb-2">暗号化ポリシー</h3>
                <p className="text-gray-700">
                  すべてのデータは、転送時および保存時の両方で暗号化されます。
                  業界標準の暗号化アルゴリズムを使用し、定期的な暗号鍵のローテーションを実施しています。
                </p>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <span className="text-2xl mr-3">🔄</span>
                    転送時の暗号化（Encryption in Transit）
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">TLS 1.3:</span>
                      <span>最新のTLSプロトコルによる通信暗号化</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">証明書:</span>
                      <span>信頼された認証局（CA）発行のSSL/TLS証明書</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">暗号スイート:</span>
                      <span>AEAD暗号（AES-GCM）、楕円曲線暗号（ECDHE）</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">HSTS:</span>
                      <span>HTTPSの強制使用（max-age=31536000）</span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <span className="text-2xl mr-3">💾</span>
                    保存時の暗号化（Encryption at Rest）
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">データベース:</span>
                      <span>AES-256-GCMによる透過的データ暗号化（TDE）</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">ストレージ:</span>
                      <span>Supabase Storage自動暗号化</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">バックアップ:</span>
                      <span>暗号化されたスナップショット、別鍵管理</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">ログファイル:</span>
                      <span>機密情報の自動マスキング</span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <span className="text-2xl mr-3">🔑</span>
                    鍵管理（Key Management）
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">HSM:</span>
                      <span>ハードウェアセキュリティモジュールによる鍵保護</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">ローテーション:</span>
                      <span>90日ごとの自動鍵ローテーション</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">階層:</span>
                      <span>マスターキー、データ暗号化キーの階層構造</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">分離:</span>
                      <span>環境ごとの独立した鍵管理</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'authentication':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">認証とアクセス制御</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">API認証</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">APIキー認証</div>
                        <div className="text-sm text-gray-600">SHA-256ハッシュ化、プレフィックス識別</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">Bearer Token方式</div>
                        <div className="text-sm text-gray-600">Authorizationヘッダー使用</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">有効期限管理</div>
                        <div className="text-sm text-gray-600">1年間の有効期限、自動失効</div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">ユーザー認証</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">パスワードポリシー</div>
                        <div className="text-sm text-gray-600">最小8文字、複雑性要件、bcrypt暗号化</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">セッション管理</div>
                        <div className="text-sm text-gray-600">セキュアクッキー、自動タイムアウト</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">2要素認証（開発中）</div>
                        <div className="text-sm text-gray-600">TOTP/SMS対応予定</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">レート制限とアクセス制御</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">プラン</th>
                        <th className="text-left py-2">分あたり</th>
                        <th className="text-left py-2">時間あたり</th>
                        <th className="text-left py-2">日あたり</th>
                        <th className="text-left py-2">IP制限</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Free</td>
                        <td>100</td>
                        <td>1,000</td>
                        <td>10,000</td>
                        <td>-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Standard</td>
                        <td>500</td>
                        <td>10,000</td>
                        <td>100,000</td>
                        <td>-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Pro</td>
                        <td>1,000</td>
                        <td>50,000</td>
                        <td>無制限</td>
                        <td>○</td>
                      </tr>
                      <tr>
                        <td className="py-2">Enterprise</td>
                        <td>カスタム</td>
                        <td>カスタム</td>
                        <td>無制限</td>
                        <td>○</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'infrastructure':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">インフラストラクチャセキュリティ</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 mr-3 bg-black rounded flex items-center justify-center text-white text-xs font-bold">V</div>
                    <h3 className="font-bold text-lg">Vercel Infrastructure</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>• エッジネットワーク（全世界70+拠点）</li>
                    <li>• DDoS保護（Cloudflare統合）</li>
                    <li>• 自動スケーリング</li>
                    <li>• インフラ監視とアラート</li>
                    <li>• ISO 27001認証取得</li>
                  </ul>
                </div>

                <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 mr-3 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">S</div>
                    <h3 className="font-bold text-lg">Supabase Infrastructure</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>• AWS上での運用</li>
                    <li>• マルチリージョン対応</li>
                    <li>• 自動バックアップ（日次）</li>
                    <li>• Point-in-Timeリカバリ</li>
                    <li>• SOC 2 Type II準拠</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">ネットワークセキュリティ</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">ファイアウォール</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• WAF（Web Application Firewall）</li>
                        <li>• IPホワイトリスト/ブラックリスト</li>
                        <li>• ジオブロッキング対応</li>
                        <li>• レート制限とスロットリング</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">DDoS対策</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• 自動DDoS緩和</li>
                        <li>• トラフィック分析と異常検知</li>
                        <li>• グローバルエニーキャスト</li>
                        <li>• レイヤー3/4/7保護</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">データセンターセキュリティ</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">物理セキュリティ</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• 24時間365日の警備</li>
                        <li>• 生体認証アクセス</li>
                        <li>• 監視カメラ</li>
                        <li>• 侵入検知システム</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">環境制御</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• 冗長電源システム</li>
                        <li>• 温度・湿度管理</li>
                        <li>• 火災検知・消火システム</li>
                        <li>• 水害対策</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">可用性</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• 99.99% SLA保証</li>
                        <li>• 自動フェイルオーバー</li>
                        <li>• 地理的冗長性</li>
                        <li>• 負荷分散</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">災害復旧とビジネス継続性</h3>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                    <p className="text-sm">
                      <strong>RPO (Recovery Point Objective):</strong> 1時間以内<br />
                      <strong>RTO (Recovery Time Objective):</strong> 4時間以内
                    </p>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">バックアップ:</span>
                      <span>日次自動バックアップ、30日間保持、地理的分散保存</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">レプリケーション:</span>
                      <span>リアルタイムデータレプリケーション、複数リージョン</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">テスト:</span>
                      <span>四半期ごとの災害復旧訓練、年次BCP見直し</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">コンプライアンス</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {certifications.map((cert, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">{cert.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        cert.status === 'compliant' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cert.status === 'compliant' ? '準拠' : '部分準拠'}
                      </span>
                    </div>
                    <p className="text-gray-700">{cert.description}</p>
                  </div>
                ))}
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">規制要件への対応</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">個人情報保護法（日本）</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• 個人情報の適切な取得・利用・管理</li>
                      <li>• 利用目的の明示と同意取得</li>
                      <li>• 安全管理措置の実施</li>
                      <li>• 第三者提供の制限</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">GDPR（EU一般データ保護規則）</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• データ主体の権利保護（アクセス権、削除権等）</li>
                      <li>• データ処理の法的根拠の明確化</li>
                      <li>• プライバシーバイデザイン</li>
                      <li>• データ侵害通知（72時間以内）</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">金融商品取引法</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• EDINETデータ利用規約の遵守</li>
                      <li>• 財務情報の正確性維持</li>
                      <li>• 内部統制の整備</li>
                      <li>• 監査証跡の保持</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">監査とレポート</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <p className="text-sm">
                    定期的な第三者監査を実施し、セキュリティ体制の継続的な改善を行っています。
                  </p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">外部監査:</span>
                    <span>年次セキュリティ監査、ペネトレーションテスト</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">内部監査:</span>
                    <span>四半期ごとのセキュリティレビュー、月次脆弱性スキャン</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">レポート:</span>
                    <span>月次セキュリティレポート、年次コンプライアンスレポート</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">監視とインシデント対応</h2>
              
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-8 mb-8">
                <h3 className="font-bold text-lg mb-4">24/7 セキュリティオペレーションセンター（SOC）</h3>
                <p className="text-gray-700 mb-4">
                  専門のセキュリティチームが24時間365日体制でシステムを監視し、
                  潜在的な脅威の検出と対応を行っています。
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">< 5分</div>
                    <div className="text-sm text-gray-600">平均検知時間</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">< 30分</div>
                    <div className="text-sm text-gray-600">初動対応時間</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">< 4時間</div>
                    <div className="text-sm text-gray-600">封じ込め時間</div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">監視項目</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">セキュリティ監視</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">●</span>
                        <span>不正アクセス試行の検知</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">●</span>
                        <span>異常なAPIアクセスパターン</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">●</span>
                        <span>マルウェア・ウイルススキャン</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">●</span>
                        <span>データ漏洩の兆候検知</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">●</span>
                        <span>権限昇格の試み</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">パフォーマンス監視</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">●</span>
                        <span>API応答時間</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">●</span>
                        <span>エラー率の監視</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">●</span>
                        <span>リソース使用率</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">●</span>
                        <span>可用性とアップタイム</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">●</span>
                        <span>トラフィック分析</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">インシデント対応プロセス</h3>
                <div className="space-y-4">
                  {incidentResponse.map((phase, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-24 text-right">
                        <span className="text-sm font-semibold text-gray-600">{phase.time}</span>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold">{phase.phase}</h4>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">インシデント通知</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <p className="text-sm">
                    重大なセキュリティインシデントが発生した場合、以下の手順で通知を行います：
                  </p>
                </div>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">即時:</span>
                    <span>影響を受けるお客様への個別通知（メール、電話）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">1時間以内:</span>
                    <span>ステータスページでの情報公開</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">24時間以内:</span>
                    <span>詳細な影響範囲と対策の報告</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">72時間以内:</span>
                    <span>規制当局への報告（必要な場合）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">事後:</span>
                    <span>根本原因分析と改善策の報告書公開</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'vulnerability':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">脆弱性管理</h2>
              
              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-6">
                <h3 className="font-bold text-lg mb-2">脆弱性管理プログラム</h3>
                <p className="text-gray-700">
                  継続的な脆弱性の発見、評価、修正を通じて、システムのセキュリティを維持・向上させています。
                  業界標準のCVSSスコアリングを使用し、リスクベースのアプローチで優先順位付けを行います。
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">脆弱性スキャン</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">自動スキャン</div>
                        <div className="text-sm text-gray-600">週次で全システムを自動スキャン</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">依存関係チェック</div>
                        <div className="text-sm text-gray-600">npm audit、Dependabot による継続的監視</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">コードスキャン</div>
                        <div className="text-sm text-gray-600">SAST/DASTツールによる静的・動的解析</div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">ペネトレーションテスト</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">年次テスト</div>
                        <div className="text-sm text-gray-600">第三者機関による包括的テスト</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">レッドチーム演習</div>
                        <div className="text-sm text-gray-600">実際の攻撃シナリオのシミュレーション</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">▶</span>
                      <div>
                        <div className="font-semibold">API セキュリティテスト</div>
                        <div className="text-sm text-gray-600">OWASP API Top 10 に基づくテスト</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-6 mt-6">
                <h3 className="font-bold text-lg mb-4">脆弱性対応SLA</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">重要度</th>
                        <th className="text-left py-3 px-4">CVSSスコア</th>
                        <th className="text-left py-3 px-4">対応期限</th>
                        <th className="text-left py-3 px-4">緩和策</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-semibold">Critical</span>
                        </td>
                        <td className="py-3 px-4">9.0 - 10.0</td>
                        <td className="py-3 px-4">24時間以内</td>
                        <td className="py-3 px-4">即時緩和策適用</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-semibold">High</span>
                        </td>
                        <td className="py-3 px-4">7.0 - 8.9</td>
                        <td className="py-3 px-4">7日以内</td>
                        <td className="py-3 px-4">72時間以内に緩和策</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold">Medium</span>
                        </td>
                        <td className="py-3 px-4">4.0 - 6.9</td>
                        <td className="py-3 px-4">30日以内</td>
                        <td className="py-3 px-4">計画的対応</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">Low</span>
                        </td>
                        <td className="py-3 px-4">0.1 - 3.9</td>
                        <td className="py-3 px-4">90日以内</td>
                        <td className="py-3 px-4">次回リリース時</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded-lg p-6 mt-6">
                <h3 className="font-bold text-lg mb-4">責任ある開示ポリシー</h3>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                  <p className="text-sm">
                    セキュリティ研究者からの脆弱性報告を歓迎します。責任ある開示に協力いただいた方には、謝礼をご用意しています。
                  </p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">報告先:</span>
                    <span>security@xbrl-api.jp</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">対応時間:</span>
                    <span>48時間以内に初回返信、7日以内に調査結果共有</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">報奨金:</span>
                    <span>重要度に応じて¥10,000〜¥500,000</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">対象外:</span>
                    <span>DoS攻撃、ソーシャルエンジニアリング、物理的攻撃</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'data-privacy':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">データプライバシー</h2>
              
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 mb-6">
                <h3 className="font-bold text-lg mb-4">プライバシーファースト設計</h3>
                <p className="text-gray-700">
                  お客様のプライバシーを最優先に考え、データの収集・処理・保管のすべての段階で
                  プライバシー保護を実装しています。必要最小限のデータのみを収集し、
                  明確な目的のもとで適切に管理します。
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">データ収集と利用</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">最小限の収集</div>
                        <div className="text-sm text-gray-600">サービス提供に必要な情報のみ収集</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">明確な同意</div>
                        <div className="text-sm text-gray-600">利用目的を明示し、同意を取得</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-indigo-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">目的外利用禁止</div>
                        <div className="text-sm text-gray-600">同意された目的以外での利用なし</div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">データ主体の権利</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">アクセス権</div>
                        <div className="text-sm text-gray-600">保有データの開示請求</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">訂正権</div>
                        <div className="text-sm text-gray-600">不正確なデータの修正</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold">削除権</div>
                        <div className="text-sm text-gray-600">データの削除要求（忘れられる権利）</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">データ保護措置</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">技術的措置</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• データの仮名化・匿名化処理</li>
                      <li>• アクセスログの暗号化と改ざん防止</li>
                      <li>• データ分類とラベリング</li>
                      <li>• DLP（Data Loss Prevention）ツールの導入</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">組織的措置</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• プライバシー影響評価（PIA）の実施</li>
                      <li>• データ保護責任者（DPO）の任命</li>
                      <li>• 従業員への定期的なプライバシー教育</li>
                      <li>• データ処理契約の締結</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">データ保持とライフサイクル</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">データ種別</th>
                        <th className="text-left py-3 px-4">保持期間</th>
                        <th className="text-left py-3 px-4">削除方法</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">アカウント情報</td>
                        <td className="py-3 px-4">退会後30日</td>
                        <td className="py-3 px-4">完全削除</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">APIアクセスログ</td>
                        <td className="py-3 px-4">90日間</td>
                        <td className="py-3 px-4">自動削除</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">セキュリティログ</td>
                        <td className="py-3 px-4">1年間</td>
                        <td className="py-3 px-4">アーカイブ後削除</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">バックアップデータ</td>
                        <td className="py-3 px-4">30日間</td>
                        <td className="py-3 px-4">暗号化削除</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">第三者との共有</h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-sm font-semibold">
                    原則として、お客様の同意なく第三者にデータを共有することはありません。
                  </p>
                </div>
                <p className="text-sm text-gray-700 mb-3">例外的に共有が必要な場合：</p>
                <ul className="space-y-2 text-sm">
                  <li>• 法令に基づく開示要求がある場合</li>
                  <li>• お客様の生命、身体、財産の保護に必要な場合</li>
                  <li>• サービス提供に必要な委託先への提供（守秘義務契約締結済み）</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        <div className="flex flex-col md:flex-row gap-8">
          {/* サイドバー */}
          <aside className="md:w-64">
            <nav className="sticky top-4">
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="mr-2">{section.icon}</span>
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {renderContent()}
            </div>
          </main>
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