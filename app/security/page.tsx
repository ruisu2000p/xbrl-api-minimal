export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 via-purple-900/50 via-indigo-900/30 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              セキュリティについて
            </h1>
            <p className="text-gray-300 text-lg">
              XBRL Financial APIのセキュリティ対策とプライバシー保護について
            </p>
          </div>

          <div className="space-y-8">
            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🔒 データ暗号化
              </h2>
              <p className="text-gray-300 mb-4">
                すべてのデータ転送はHTTPS/TLS 1.2以上で暗号化され、機密情報の保護を確保しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>エンドツーエンド暗号化によるデータ保護</li>
                <li>データベース内での暗号化保存</li>
                <li>定期的な暗号化キーのローテーション</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🛡️ APIセキュリティ
              </h2>
              <p className="text-gray-300 mb-4">
                堅牢なAPI認証システムにより、不正アクセスを防止しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>JWT（JSON Web Token）による認証</li>
                <li>レート制限によるDDoS攻撃対策</li>
                <li>IPホワイトリスト機能</li>
                <li>API利用状況の監視・ログ記録</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📊 インフラストラクチャセキュリティ
              </h2>
              <p className="text-gray-300 mb-4">
                世界クラスのクラウドインフラストラクチャで運用し、高水準のセキュリティを維持しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>AWS/Vercelの認定セキュリティ基準に準拠</li>
                <li>定期的なセキュリティ監査の実施</li>
                <li>自動バックアップとディザスタリカバリ</li>
                <li>24時間体制のシステム監視</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                👥 アクセス管理
              </h2>
              <p className="text-gray-300 mb-4">
                厳格なアクセス制御により、お客様のデータを保護しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>多要素認証（MFA）の実装</li>
                <li>最小権限の原則に基づくアクセス管理</li>
                <li>定期的なアクセス権限の見直し</li>
                <li>セキュリティログの詳細記録</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🚨 セキュリティインシデント対応
              </h2>
              <p className="text-gray-300 mb-4">
                万が一のセキュリティインシデントに備えた包括的な対応体制を整備しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>24時間セキュリティ監視体制</li>
                <li>迅速なインシデント対応プロセス</li>
                <li>お客様への透明性のある報告</li>
                <li>継続的なセキュリティ改善プログラム</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📋 認証・コンプライアンス
              </h2>
              <p className="text-gray-300 mb-4">
                国際的なセキュリティ基準に準拠し、お客様の信頼を確保しています。
              </p>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>SOC 2 Type II準拠</li>
                <li>ISO 27001セキュリティ管理体制</li>
                <li>GDPR（EU一般データ保護規則）対応</li>
                <li>個人情報保護法遵守</li>
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📞 セキュリティに関するお問い合わせ
              </h2>
              <p className="text-gray-300 mb-4">
                セキュリティに関するご質問やご不明な点がございましたら、お気軽にお問い合わせください。
              </p>
              <div className="text-gray-300 space-y-2">
                <p><strong>セキュリティ専用メール:</strong> security@xbrl-api.com</p>
                <p><strong>緊急時連絡先:</strong> 24時間対応サポート</p>
                <p><strong>脆弱性報告:</strong> セキュリティ研究者の方々からの報告を歓迎します</p>
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