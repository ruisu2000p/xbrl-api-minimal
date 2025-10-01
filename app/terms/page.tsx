'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const translations = {
  ja: {
    back: '← 戻る',
    title: '利用規約',
    pageTitle: 'XBRL Financial Data API 利用規約',
    intro: '本利用規約（以下「本規約」といいます）は、当社が提供するXBRL Financial Data API（以下「本サービス」といいます）の利用に関して、利用者と当社との間の権利義務関係を定めることを目的とし、利用者と当社との間の本サービスの利用に関わる一切の関係に適用されます。',
    article1Title: '第1条（適用）',
    article2Title: '第2条（利用登録）',
    article3Title: '第3条（APIキーの管理）',
    article4Title: '第4条（料金および支払方法）',
    article5Title: '第5条（禁止事項）',
    article6Title: '第6条（本サービスの提供の停止等）',
    article7Title: '第7条（利用制限および登録抹消）',
    article8Title: '第8条（退会）',
    article9Title: '第9条（保証の否認および免責事項）',
    article10Title: '第10条（サービス内容の変更等）',
    article11Title: '第11条（利用規約の変更）',
    article12Title: '第12条（個人情報の取扱い）',
    article13Title: '第13条（通知または連絡）',
    article14Title: '第14条（権利義務の譲渡の禁止）',
    article15Title: '第15条（準拠法・裁判管轄）',
    enacted: '制定日：2025年8月14日',
    updated: '最終更新：2025年8月14日'
  },
  en: {
    back: '← Back',
    title: 'Terms of Service',
    pageTitle: 'XBRL Financial Data API Terms of Service',
    intro: 'These Terms of Service ("Terms") are intended to define the rights and obligations between the User and the Company regarding the use of the XBRL Financial Data API ("Service") provided by the Company, and shall apply to all relationships between the User and the Company regarding the use of the Service.',
    article1Title: 'Article 1 (Application)',
    article2Title: 'Article 2 (User Registration)',
    article3Title: 'Article 3 (API Key Management)',
    article4Title: 'Article 4 (Fees and Payment Methods)',
    article5Title: 'Article 5 (Prohibited Actions)',
    article6Title: 'Article 6 (Suspension of Service)',
    article7Title: 'Article 7 (Restriction and Cancellation of Registration)',
    article8Title: 'Article 8 (Withdrawal)',
    article9Title: 'Article 9 (Disclaimer of Warranties)',
    article10Title: 'Article 10 (Changes to Service Content)',
    article11Title: 'Article 11 (Changes to Terms)',
    article12Title: 'Article 12 (Handling of Personal Information)',
    article13Title: 'Article 13 (Notifications and Communications)',
    article14Title: 'Article 14 (Prohibition of Transfer of Rights and Obligations)',
    article15Title: 'Article 15 (Governing Law and Jurisdiction)',
    enacted: 'Enacted: August 14, 2025',
    updated: 'Last Updated: August 14, 2025'
  }
};

export default function TermsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  useEffect(() => {
    // ブラウザの言語設定を取得
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      setLang('en');
    }
  }, []);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                {t.back}
              </button>
              <h1 className="text-xl font-bold">{t.title}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('ja')}
                className={`px-3 py-1 rounded ${lang === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                日本語
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded ${lang === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">{t.pageTitle}</h1>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-8">
              {t.intro}
            </p>

            {lang === 'ja' ? (
              <>
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article1Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>本規約は、利用者が本サービスを利用する際の一切の関係に適用されます。</li>
                    <li>当社が本サービス上で別途定める利用ルールなどは、本規約の一部を構成するものとします。</li>
                    <li>本規約の内容と前項のルールその他の本規約外における本サービスの説明等とが矛盾する場合には、本規約の規定が優先されるものとします。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article2Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article3Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>利用者は、自己の責任において、本サービスのAPIキーを適切に管理するものとします。</li>
                    <li>利用者は、いかなる場合にも、APIキーを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
                    <li>APIキーの管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任は利用者が負うものとし、当社は一切の責任を負いません。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article4Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>利用者は、本サービスの有料プランの対価として、当社が別途定め、本ウェブサイトに表示する利用料金を、当社が指定する方法により支払うものとします。</li>
                    <li>利用料金の支払いを遅滞した場合、利用者は年14.6％の割合による遅延損害金を支払うものとします。</li>
                    <li>利用者が本サービスの利用料金の支払いを遅滞した場合、当社は本サービスの提供を停止することができるものとします。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article5Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article6Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article7Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article8Title}</h2>
                  <p className="text-gray-700">利用者は、当社の定める退会手続により、本サービスから退会できるものとします。</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article9Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
                    <li>当社は、本サービスに起因して利用者に生じたあらゆる損害について一切の責任を負いません。ただし、本サービスに関する当社と利用者との間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。</li>
                    <li>前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます。）による債務不履行または不法行為によって利用者に生じた損害のうち特別な事情から生じた損害（当社または利用者が損害発生につき予見し、または予見し得た場合を含みます。）について一切の責任を負いません。また、当社の過失（重過失を除きます。）による債務不履行または不法行為によって利用者に生じた損害の賠償は、利用者から当該損害が発生した月に受領した利用料の額を上限とします。</li>
                    <li>当社は、本サービスに関して、利用者と他の利用者または第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article10Title}</h2>
                  <p className="text-gray-700">当社は、利用者に通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによって利用者に生じた損害について一切の責任を負いません。</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article11Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article12Title}</h2>
                  <p className="text-gray-700">当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article13Title}</h2>
                  <p className="text-gray-700">利用者と当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、利用者から、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時に利用者へ到達したものとみなします。</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article14Title}</h2>
                  <p className="text-gray-700">利用者は、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article15Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                    <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
                  </ol>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article1Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>These Terms shall apply to all relationships when the User uses the Service.</li>
                    <li>Usage rules separately determined by the Company on the Service shall constitute part of these Terms.</li>
                    <li>In the event of any conflict between the content of these Terms and the rules or other explanations of the Service outside these Terms, the provisions of these Terms shall prevail.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article2Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>For the Service, the user registration shall be completed when the applicant for registration agrees to these Terms, applies for user registration by the method prescribed by the Company, and the Company approves such application.</li>
                    <li>The Company may not approve an application for user registration if it determines that the applicant falls under any of the following reasons, and the Company shall have no obligation to disclose the reasons therefor.
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>If false information is provided in the application for user registration</li>
                        <li>If the application is from a person who has violated these Terms</li>
                        <li>In other cases where the Company determines that the user registration is not appropriate</li>
                      </ul>
                    </li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article3Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The User shall appropriately manage the API key of the Service at their own responsibility.</li>
                    <li>The User may not, under any circumstances, transfer or lend the API key to a third party, or share it with a third party.</li>
                    <li>The User shall be responsible for any damage caused by insufficient management of the API key, errors in use, use by third parties, etc., and the Company shall not be liable for any such damage.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article4Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The User shall pay the usage fee separately determined by the Company and displayed on this website as consideration for the paid plan of the Service by the method designated by the Company.</li>
                    <li>If the payment of the usage fee is delayed, the User shall pay late payment damages at an annual rate of 14.6%.</li>
                    <li>If the User delays the payment of the usage fee for the Service, the Company may suspend the provision of the Service.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article5Title}</h2>
                  <p className="mb-4 text-gray-700">When using the Service, the User shall not engage in the following actions:</p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Acts that violate laws or public order and morals</li>
                    <li>Acts related to criminal activity</li>
                    <li>Acts that infringe on copyrights, trademark rights, and other intellectual property rights included in the content of the Service</li>
                    <li>Acts that destroy or interfere with the function of the server or network of the Company, other users, or other third parties</li>
                    <li>Acts of commercially using information obtained through the Service</li>
                    <li>Acts that may interfere with the operation of the Company&apos;s Service</li>
                    <li>Acts of unauthorized access or attempts thereof</li>
                    <li>Acts of collecting or accumulating personal information about other users</li>
                    <li>Acts of using the Service for illegal, improper, or inappropriate purposes</li>
                    <li>Acts that cause disadvantage, damage, or discomfort to other users of the Service or other third parties</li>
                    <li>Other acts that the Company deems inappropriate</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article6Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company may suspend or discontinue the provision of all or part of the Service without prior notice to the User if it determines that any of the following reasons exists:
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>When performing maintenance, inspection, or updating of the computer system related to the Service</li>
                        <li>When the provision of the Service becomes difficult due to force majeure such as earthquakes, lightning, fire, power outages, or natural disasters</li>
                        <li>When computers or communication lines stop due to an accident</li>
                        <li>In other cases where the Company determines that the provision of the Service is difficult</li>
                      </ul>
                    </li>
                    <li>The Company shall not be liable for any disadvantage or damage suffered by the User or third parties due to the suspension or discontinuation of the provision of the Service.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article7Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company may, without prior notice, delete posted data, restrict the User&apos;s use of all or part of the Service, or cancel the User&apos;s registration if the User falls under any of the following:
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>If any provision of these Terms is violated</li>
                        <li>If it is found that there are false facts in the registered information</li>
                        <li>If there is a default in payment obligations such as fees</li>
                        <li>If there is no response to communications from the Company for a certain period</li>
                        <li>If there has been no use of the Service for a certain period since the last use</li>
                        <li>In other cases where the Company determines that the use of the Service is inappropriate</li>
                      </ul>
                    </li>
                    <li>The Company shall not be liable for any damage caused to the User by actions taken by the Company based on this article.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article8Title}</h2>
                  <p className="text-gray-700">Users may withdraw from the Service by following the withdrawal procedures prescribed by the Company.</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article9Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company does not guarantee, either expressly or implicitly, that the Service is free from factual or legal defects (including defects related to safety, reliability, accuracy, completeness, effectiveness, fitness for a particular purpose, security, etc., as well as errors, bugs, infringement of rights, etc.).</li>
                    <li>The Company shall not be liable for any damage caused to the User arising from the Service. However, this disclaimer shall not apply if the contract between the Company and the User regarding the Service (including these Terms) constitutes a consumer contract as defined by the Consumer Contract Act.</li>
                    <li>Even in the cases specified in the proviso of the preceding paragraph, the Company shall not be liable for any damage arising from special circumstances (including cases where the Company or the User foresaw or could have foreseen the occurrence of damage) among damages caused to the User due to the Company&apos;s negligence (excluding gross negligence) or tort. Furthermore, compensation for damages caused to the User due to the Company&apos;s negligence (excluding gross negligence) or tort shall be limited to the amount of the usage fee received from the User in the month in which the damage occurred.</li>
                    <li>The Company shall not be responsible for any transactions, communications, or disputes that occur between the User and other users or third parties regarding the Service.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article10Title}</h2>
                  <p className="text-gray-700">The Company may change the content of the Service or discontinue the provision of the Service without notice to the User, and shall not be liable for any damage caused to the User thereby.</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article11Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company may change these Terms without the individual consent of the User in the following cases:
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>When the change to these Terms is in accordance with the general interests of the User.</li>
                        <li>When the change to these Terms does not contradict the purpose of the service use contract and is reasonable in light of the necessity of the change, the adequacy of the content after the change, and other circumstances related to the change.</li>
                      </ul>
                    </li>
                    <li>When making changes to these Terms pursuant to the preceding paragraph, the Company shall notify users in advance of the fact that these Terms will be changed, the content of these Terms after the change, and the effective date thereof.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article12Title}</h2>
                  <p className="text-gray-700">The Company shall appropriately handle personal information acquired through the use of the Service in accordance with the Company&apos;s &quot;Privacy Policy.&quot;</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article13Title}</h2>
                  <p className="text-gray-700">Notices or communications between the User and the Company shall be made by the method prescribed by the Company. Unless the Company receives a change notification from the User in accordance with the format separately determined by the Company, the Company shall deem the currently registered contact information to be valid and shall send notifications or communications to such contact information, which shall be deemed to have reached the User at the time of transmission.</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article14Title}</h2>
                  <p className="text-gray-700">The User may not transfer their status under the usage contract or their rights or obligations under these Terms to a third party or use them as collateral without the Company&apos;s prior written consent.</p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article15Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>These Terms shall be governed by Japanese law.</li>
                    <li>In the event of any dispute arising in connection with the Service, the court having jurisdiction over the location of the Company&apos;s head office shall have exclusive agreed jurisdiction.</li>
                  </ol>
                </section>
              </>
            )}

            <div className="mt-12 pt-8 border-t">
              <p className="text-gray-600 text-sm">
                {t.enacted}<br />
                {t.updated}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
