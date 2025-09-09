export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              財務データMCP
            </a>
            <a href="/" className="text-gray-600 hover:text-gray-900">
              ホームに戻る
            </a>
          </div>
        </div>
      </header>

      {/* 利用規約コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">最終更新日: 2025年1月1日</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第1条（適用）</h2>
            <p className="text-gray-700 mb-4">
              本規約は、財務データMCP（以下「本サービス」）の利用条件を定めるものです。
              利用者の皆さま（以下「ユーザー」）には、本規約に従って本サービスをご利用いただきます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第2条（利用登録）</h2>
            <p className="text-gray-700 mb-4">
              1. 登録希望者が当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社は、以下の場合には登録申請を承認しないことがあります：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>登録申請に際して虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他、当社が利用登録を相当でないと判断した場合</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第3条（APIキーの管理）</h2>
            <p className="text-gray-700 mb-4">
              1. ユーザーは、自己の責任において、本サービスのAPIキーを適切に管理するものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. ユーザーは、いかなる場合にも、APIキーを第三者に譲渡または貸与することはできません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第4条（利用料金）</h2>
            <p className="text-gray-700 mb-4">
              1. ユーザーは、本サービスの利用プランに応じて、当社が別途定める利用料金を支払うものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. Freeプラン：無料（直近1年分のデータアクセス）
            </p>
            <p className="text-gray-700 mb-4">
              3. Proプラン：月額2,980円（制限なしアクセス）
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第5条（禁止事項）</h2>
            <p className="text-gray-700 mb-4">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>サーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>本サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>データの転売、再配布を行う行為</li>
              <li>過度なAPIリクエストによりサービスに負荷をかける行為</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第6条（データの利用）</h2>
            <p className="text-gray-700 mb-4">
              1. 本サービスで提供されるデータは、情報提供を目的としており、投資判断の最終的な決定はユーザー自身の責任において行うものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社は、データの正確性、完全性、有用性等について、いかなる保証も行いません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第7条（サービスの変更・中断）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、ユーザーに通知することなく本サービスの内容を変更または提供を中止することができるものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社は、以下の場合には、本サービスの提供を一時的に中断することができるものとします：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第8条（免責事項）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社は、本サービスの提供の中断、停止、終了、利用不能または変更によってユーザーに生じた損害について、一切の責任を負いません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第9条（個人情報の取扱い）</h2>
            <p className="text-gray-700 mb-4">
              当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第10条（規約の変更）</h2>
            <p className="text-gray-700 mb-4">
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              変更後の本規約は、当社ウェブサイトに掲示された時点から効力を生じるものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第11条（準拠法・裁判管轄）</h2>
            <p className="text-gray-700 mb-4">
              1. 本規約の解釈にあたっては、日本法を準拠法とします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              以上
            </p>
            <p className="text-gray-600 text-sm mt-4">
              お問い合わせ: support@xbrl-api.example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}