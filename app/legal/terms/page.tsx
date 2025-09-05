'use client';

import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
              <h1 className="text-xl font-bold">利用規約</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">XBRL Financial Data API 利用規約</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-8">
              本利用規約（以下「本規約」といいます）は、当社が提供するXBRL Financial Data API（以下「本サービス」といいます）の利用に関して、利用者と当社との間の権利義務関係を定めることを目的とし、利用者と当社との間の本サービスの利用に関わる一切の関係に適用されます。
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第1条（適用）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>本規約は、利用者が本サービスを利用する際の一切の関係に適用されます。</li>
                <li>当社が本サービス上で別途定める利用ルールなどは、本規約の一部を構成するものとします。</li>
                <li>本規約の内容と前項のルールその他の本規約外における本サービスの説明等とが矛盾する場合には、本規約の規定が優先されるものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第2条（利用登録）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
                <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                    <li>本規約に違反したことがある者からの申請である場合</li>
                    <li>その他、当社が利用登録を相当でないと判断した場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第3条（APIキーの管理）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>利用者は、自己の責任において、本サービスのAPIキーを適切に管理するものとします。</li>
                <li>利用者は、いかなる場合にも、APIキーを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
                <li>APIキーの管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任は利用者が負うものとし、当社は一切の責任を負いません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第4条（料金および支払方法）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>利用者は、本サービスの有料プランの対価として、当社が別途定め、本ウェブサイトに表示する利用料金を、当社が指定する方法により支払うものとします。</li>
                <li>利用料金の支払いを遅滞した場合、利用者は年14.6％の割合による遅延損害金を支払うものとします。</li>
                <li>利用者が本サービスの利用料金の支払いを遅滞した場合、当社は本サービスの提供を停止することができるものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第5条（禁止事項）</h2>
              <p className="mb-4 text-gray-700">利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                <li>当社、ほかの利用者、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>本サービスによって得られた情報を商業的に利用する行為</li>
                <li>当社のサービスの運営を妨害するおそれのある行為</li>
                <li>不正アクセスをし、またはこれを試みる行為</li>
                <li>他の利用者に関する個人情報等を収集または蓄積する行為</li>
                <li>違法、不正または不当な目的を持って本サービスを利用する行為</li>
                <li>本サービスの他の利用者またはその他の第三者に不利益、損害、不快感を与える行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第6条（本サービスの提供の停止等）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、以下のいずれかの事由があると判断した場合、利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                  </ul>
                </li>
                <li>当社は、本サービスの提供の停止または中断により、利用者または第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第7条（利用制限および登録抹消）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、利用者が以下のいずれかに該当する場合には、事前の通知なく、投稿データを削除し、利用者に対して本サービスの全部もしくは一部の利用を制限しまたは利用者としての登録を抹消することができるものとします。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>本規約のいずれかの条項に違反した場合</li>
                    <li>登録事項に虚偽の事実があることが判明した場合</li>
                    <li>料金等の支払債務の不履行があった場合</li>
                    <li>当社からの連絡に対し、一定期間返答がない場合</li>
                    <li>本サービスについて、最後の利用から一定期間利用がない場合</li>
                    <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
                  </ul>
                </li>
                <li>当社は、本条に基づき当社が行った行為により利用者に生じた損害について、一切の責任を負いません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第8条（退会）</h2>
              <p className="text-gray-700">利用者は、当社の定める退会手続により、本サービスから退会できるものとします。</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第9条（保証の否認および免責事項）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
                <li>当社は、本サービスに起因して利用者に生じたあらゆる損害について一切の責任を負いません。ただし、本サービスに関する当社と利用者との間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。</li>
                <li>前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます。）による債務不履行または不法行為によって利用者に生じた損害のうち特別な事情から生じた損害（当社または利用者が損害発生につき予見し、または予見し得た場合を含みます。）について一切の責任を負いません。また、当社の過失（重過失を除きます。）による債務不履行または不法行為によって利用者に生じた損害の賠償は、利用者から当該損害が発生した月に受領した利用料の額を上限とします。</li>
                <li>当社は、本サービスに関して、利用者と他の利用者または第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第10条（サービス内容の変更等）</h2>
              <p className="text-gray-700">当社は、利用者に通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによって利用者に生じた損害について一切の責任を負いません。</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第11条（利用規約の変更）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>当社は以下の場合には、利用者の個別の同意を要せず、本規約を変更することができるものとします。
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>本規約の変更が、利用者の一般の利益に適合するとき。</li>
                    <li>本規約の変更が、本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。</li>
                  </ul>
                </li>
                <li>当社はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知いたします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第12条（個人情報の取扱い）</h2>
              <p className="text-gray-700">当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第13条（通知または連絡）</h2>
              <p className="text-gray-700">利用者と当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、利用者から、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時に利用者へ到達したものとみなします。</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第14条（権利義務の譲渡の禁止）</h2>
              <p className="text-gray-700">利用者は、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">第15条（準拠法・裁判管轄）</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
              </ol>
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