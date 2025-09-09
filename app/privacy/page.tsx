export default function PrivacyPage() {
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

      {/* プライバシーポリシーコンテンツ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">最終更新日: 2025年1月1日</p>

          <section className="mb-8">
            <p className="text-gray-700 mb-4">
              財務データMCP（以下「当社」）は、本ウェブサイト上で提供するサービス（以下「本サービス」）における、
              ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第1条（個人情報）</h2>
            <p className="text-gray-700 mb-4">
              「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、
              当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報、
              及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報を指します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第2条（個人情報の収集方法）</h2>
            <p className="text-gray-700 mb-4">
              当社は、ユーザーが利用登録をする際に以下の情報をお尋ねすることがあります：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>氏名</li>
              <li>メールアドレス</li>
              <li>会社名（任意）</li>
              <li>その他当社が定める入力フォームにユーザーが入力する情報</li>
            </ul>
            <p className="text-gray-700 mb-4">
              また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録に関する情報を、
              当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」）などから収集することがあります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第3条（個人情報を収集・利用する目的）</h2>
            <p className="text-gray-700 mb-4">
              当社が個人情報を収集・利用する目的は、以下のとおりです：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>本サービスの提供・運営のため</li>
              <li>ユーザーからのお問い合わせに回答するため</li>
              <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等の案内のメールを送付するため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
              <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
              <li>ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため</li>
              <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
              <li>上記の利用目的に付随する目的</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第4条（利用目的の変更）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第5条（個人情報の第三者提供）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
              ただし、個人情報保護法その他の法令で認められる場合を除きます。
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、
                本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
              <li>予め次の事項を告知あるいは公表し、かつ当社が個人情報保護委員会に届出をしたとき</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第6条（個人情報の開示）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。
              ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
              <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
              <li>その他法令に違反することとなる場合</li>
            </ul>
            <p className="text-gray-700 mb-4">
              2. 前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第7条（個人情報の訂正および削除）</h2>
            <p className="text-gray-700 mb-4">
              1. ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、当社が定める手続きにより、当社に対して個人情報の訂正、追加または削除（以下「訂正等」）を請求することができます。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社は、ユーザーから前項の請求を受けてその請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。
            </p>
            <p className="text-gray-700 mb-4">
              3. 当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第8条（個人情報の利用停止等）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、
              または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」）を求められた場合には、
              遅滞なく必要な調査を行います。
            </p>
            <p className="text-gray-700 mb-4">
              2. 前項の調査結果に基づき、その請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第9条（Cookie）</h2>
            <p className="text-gray-700 mb-4">
              1. 当社のサービスは、Cookieを使用して、ユーザーの利便性向上、利用状況の把握等を行っています。
            </p>
            <p className="text-gray-700 mb-4">
              2. ユーザーは、ブラウザの設定によりCookieの受信を拒否することができます。
              ただし、Cookieの受信を拒否した場合、サービスの一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第10条（セキュリティ）</h2>
            <p className="text-gray-700 mb-4">
              当社は、個人情報の紛失、破壊、改ざん及び漏洩などを防止するため、不正アクセス対策、コンピュータウイルス対策など適切なセキュリティ対策を講じます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第11条（プライバシーポリシーの変更）</h2>
            <p className="text-gray-700 mb-4">
              1. 本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。
            </p>
            <p className="text-gray-700 mb-4">
              2. 当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">第12条（お問い合わせ窓口）</h2>
            <p className="text-gray-700 mb-4">
              本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
            </p>
            <p className="text-gray-700 mb-4">
              Eメール: privacy@xbrl-api.example.com
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              以上
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}