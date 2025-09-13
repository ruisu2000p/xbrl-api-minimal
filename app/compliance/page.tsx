export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-purple-800 via-indigo-800 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              コンプライアンスについて
            </h1>
            <p className="text-gray-300 text-lg">
              XBRL Financial APIの法規制遵守と業界標準への対応について
            </p>
          </div>

          <div className="space-y-8">
            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📋 法規制への準拠
              </h2>
              <p className="text-gray-300 mb-4">
                日本および国際的な法規制に完全に準拠し、お客様に安心してサービスをご利用いただけます。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>個人情報保護法（日本）への完全準拠</li>
                <li>GDPR（EU一般データ保護規則）対応</li>
                <li>金融商品取引法に基づく開示資料の適切な取り扱い</li>
                <li>著作権法の遵守と適切なデータ利用</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🏛️ 金融業界標準への対応
              </h2>
              <p className="text-gray-300 mb-4">
                金融業界の厳格な基準に準拠し、信頼性の高いサービスを提供しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>XBRL国際標準（XBRL International）準拠</li>
                <li>金融庁のEDINET仕様書に基づくデータ処理</li>
                <li>日本公認会計士協会のガイドラインに準拠</li>
                <li>国際会計基準（IFRS）データの適切な取り扱い</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🔒 データプライバシー
              </h2>
              <p className="text-gray-300 mb-4">
                お客様のプライバシーを最優先に考え、データの適切な管理を行っています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>データ最小化の原則に基づく情報収集</li>
                <li>明確な同意に基づくデータ利用</li>
                <li>データ保持期間の適切な管理</li>
                <li>お客様のデータアクセス権・削除権の保障</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📊 品質管理体制
              </h2>
              <p className="text-gray-300 mb-4">
                継続的な品質向上により、お客様に最高品質のサービスを提供します。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>ISO 9001品質マネジメントシステム</li>
                <li>定期的な内部監査の実施</li>
                <li>継続的改善プロセス（PDCA）の運用</li>
                <li>お客様フィードバックの体系的な分析</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🌐 国際基準への対応
              </h2>
              <p className="text-gray-300 mb-4">
                グローバルスタンダードに準拠し、国際的な信頼性を確保しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>SOC 2 Type II認証取得</li>
                <li>ISO 27001情報セキュリティマネジメント</li>
                <li>ISO 27017クラウドセキュリティ</li>
                <li>PCI DSS（決済カード業界データセキュリティ基準）準拠</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🔍 監査・透明性
              </h2>
              <p className="text-gray-300 mb-4">
                定期的な監査により透明性を確保し、お客様の信頼にお応えします。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>年次外部監査の実施</li>
                <li>四半期ごとの内部コンプライアンス確認</li>
                <li>透明性レポートの定期公開</li>
                <li>第三者機関による独立した評価</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📋 コンプライアンス報告
              </h2>
              <p className="text-gray-300 mb-4">
                コンプライアンスに関する違反や懸念がございましたら、以下の方法でご報告ください。
              </p>
              <div className="text-gray-300 space-y-3">
                <div>
                  <p><strong>コンプライアンス専用窓口:</strong></p>
                  <p>メール: compliance@xbrl-api.com</p>
                  <p>電話: 0120-XXX-XXX（平日 9:00-17:00）</p>
                </div>
                <div>
                  <p><strong>匿名通報制度:</strong></p>
                  <p>匿名でのご報告も受け付けています</p>
                </div>
                <div>
                  <p><strong>内部通報者保護:</strong></p>
                  <p>報告者の身元保護と不利益な扱いの禁止を保証します</p>
                </div>
              </div>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📜 関連文書
              </h2>
              <div className="text-gray-300 space-y-2">
                <p>• <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">プライバシーポリシー</a></p>
                <p>• <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">利用規約</a></p>
                <p>• <a href="/security" className="text-blue-400 hover:text-blue-300 underline">セキュリティ対策</a></p>
                <p>• <a href="/support" className="text-blue-400 hover:text-blue-300 underline">サポート情報</a></p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-400">
              最終更新日: 2025年1月
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}