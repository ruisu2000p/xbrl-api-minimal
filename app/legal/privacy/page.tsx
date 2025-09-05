'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">プライバシーポリシー</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-8">
              当社（以下「当社」）は、本ウェブサイト上で提供するサービス（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第1条（個人情報）</h2>
              <p className="text-gray-700">
                「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第2条（個人情報の収集方法）</h2>
              <p className="text-gray-700 mb-4">
                当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」といいます。）などから収集することがあります。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第3条（個人情報を収集・利用する目的）</h2>
              <p className="text-gray-700 mb-4">当社が個人情報を収集・利用する目的は、以下のとおりです。</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社サービスの提供・運営のため</li>
                <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当社が提供する他のサービスの案内のメールを送付するため</li>
                <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
                <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                <li>ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため</li>
                <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
                <li>上記の利用目的に付随する目的</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第4条（利用目的の変更）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。</li>
                <li>利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第5条（個人情報の第三者提供）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                    <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                    <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                    <li>予め次の事項を告知あるいは公表し、かつ当社が個人情報保護委員会に届出をしたとき
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>利用目的に第三者への提供を含むこと</li>
                        <li>第三者に提供されるデータの項目</li>
                        <li>第三者への提供の手段または方法</li>
                        <li>本人の求めに応じて個人情報の第三者への提供を停止すること</li>
                        <li>本人の求めを受け付ける方法</li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li>前項の定めにかかわらず、次に掲げる場合には、当該情報の提供先は第三者に該当しないものとします。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>当社が利用目的の達成に必要な範囲内において個人情報の取扱いの全部または一部を委託する場合</li>
                    <li>合併その他の事由による事業の承継に伴って個人情報が提供される場合</li>
                    <li>個人情報を特定の者との間で共同して利用する場合であって、その旨並びに共同して利用される個人情報の項目、共同して利用する者の範囲、利用する者の利用目的および当該個人情報の管理について責任を有する者の氏名または名称について、あらかじめ本人に通知し、または本人が容易に知り得る状態に置いた場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第6条（個人情報の開示）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、本人から個人情報の開示を求められたときは、遅滞なく本人に対し、開示いたします。ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                    <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                    <li>その他法令に違反することとなる場合</li>
                  </ul>
                </li>
                <li>前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第7条（個人情報の訂正および削除）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、当社が定める手続きにより、当社に対して個人情報の訂正、追加または削除（以下「訂正等」といいます。）を請求することができます。</li>
                <li>当社は、ユーザーから前項の請求を受けてその請求に理由があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。</li>
                <li>当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第8条（個人情報の利用停止等）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」といいます。）を求められた場合には、遅滞なく必要な調査を行います。</li>
                <li>前項の調査結果に基づき、その請求に理由があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。</li>
                <li>当社は、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、遅滞なく、これをユーザーに通知します。</li>
                <li>前2項にかかわらず、利用停止等に多額の費用を有する場合その他利用停止等を行うことが困難な場合であって、ユーザーの権利利益を保護するために必要なこれに代わるべき措置をとれる場合は、この代替策を講じるものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第9条（Cookieの利用）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、本サービスにおいて、Cookie及び類似技術を利用します。これらの技術により、当社はユーザーのアクセス状況を分析し、本サービスの改善や、ユーザーにとってより有用な情報を提供することができます。</li>
                <li>Cookieを無効にする方法やCookieに関する詳細については、各ブラウザのヘルプ機能をご確認ください。ただし、Cookieを無効にすると本サービスの一部機能がご利用いただけない場合があります。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第10条（アクセス解析ツール）</h2>
              <p className="text-gray-700 mb-4">
                当社は、本サービスの利用状況を分析するため、Google Analytics等のアクセス解析ツールを利用しています。これらのツールはCookieを利用して情報を収集しますが、個人を特定する情報は含まれません。この機能はCookieを無効にすることで収集を拒否することができますので、お使いのブラウザの設定をご確認ください。
              </p>
              <p className="text-gray-700">
                Google Analyticsの利用規約およびプライバシーポリシーについては、Google Analyticsのサイトをご確認ください。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第11条（プライバシーポリシーの変更）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。</li>
                <li>当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第12条（お問い合わせ窓口）</h2>
              <p className="text-gray-700">
                本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700">
                  <strong>お問い合わせ先：</strong><br />
                  メールアドレス: privacy@xbrl-api.example.com<br />
                  受付時間: 平日 9:00-18:00（土日祝日、年末年始を除く）
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第13条（データの国際移転）</h2>
              <p className="text-gray-700">
                当社は、本サービスの提供のため、ユーザーの個人情報を日本国外にあるサーバーで処理する場合があります。この場合、当社は適切な安全管理措置を講じ、個人情報保護法その他関連法令に従って適切に取り扱います。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第14条（データ保存期間）</h2>
              <p className="text-gray-700">
                当社は、個人情報を利用目的の達成に必要な期間に限って保存します。ただし、法令により保存が義務づけられている場合や、正当な事業上の理由がある場合には、この限りではありません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第15条（セキュリティ）</h2>
              <p className="text-gray-700">
                当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の適切な管理のために、適切な安全管理措置を講じます。また、個人情報を取り扱う従業者に対して、必要かつ適切な監督を行います。
              </p>
            </section>

            <div className="mt-12 pt-8 border-t">
              <p className="text-gray-600 text-sm">
                制定日：2025年8月14日<br />
                最終更新：2025年8月14日
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}