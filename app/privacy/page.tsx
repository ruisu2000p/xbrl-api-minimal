'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const translations = {
  ja: {
    back: '← 戻る',
    title: 'プライバシーポリシー',
    pageTitle: 'プライバシーポリシー',
    intro: '当社（以下「当社」）は、本ウェブサイト上で提供するサービス（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。',
    article1Title: '第1条（個人情報）',
    article2Title: '第2条（個人情報の収集方法）',
    article3Title: '第3条（個人情報を収集・利用する目的）',
    article4Title: '第4条（利用目的の変更）',
    article5Title: '第5条（個人情報の第三者提供）',
    article6Title: '第6条（個人情報の開示）',
    article7Title: '第7条（個人情報の訂正および削除）',
    article8Title: '第8条（個人情報の利用停止等）',
    article9Title: '第9条（Cookieの利用）',
    article10Title: '第10条（アクセス解析ツール）',
    article11Title: '第11条（プライバシーポリシーの変更）',
    article12Title: '第12条（お問い合わせ窓口）',
    article13Title: '第13条（データの国際移転）',
    article14Title: '第14条（データ保存期間）',
    article15Title: '第15条（セキュリティ）',
    enacted: '制定日：2025年8月14日',
    updated: '最終更新：2025年8月14日'
  },
  en: {
    back: '← Back',
    title: 'Privacy Policy',
    pageTitle: 'Privacy Policy',
    intro: 'The Company (hereinafter referred to as "the Company") establishes the following Privacy Policy (hereinafter referred to as "this Policy") regarding the handling of personal information of users in the services (hereinafter referred to as "the Service") provided on this website.',
    article1Title: 'Article 1 (Personal Information)',
    article2Title: 'Article 2 (Method of Collecting Personal Information)',
    article3Title: 'Article 3 (Purpose of Collecting and Using Personal Information)',
    article4Title: 'Article 4 (Changes to Purpose of Use)',
    article5Title: 'Article 5 (Provision of Personal Information to Third Parties)',
    article6Title: 'Article 6 (Disclosure of Personal Information)',
    article7Title: 'Article 7 (Correction and Deletion of Personal Information)',
    article8Title: 'Article 8 (Suspension of Use of Personal Information)',
    article9Title: 'Article 9 (Use of Cookies)',
    article10Title: 'Article 10 (Access Analysis Tools)',
    article11Title: 'Article 11 (Changes to Privacy Policy)',
    article12Title: 'Article 12 (Contact)',
    article13Title: 'Article 13 (International Data Transfer)',
    article14Title: 'Article 14 (Data Retention Period)',
    article15Title: 'Article 15 (Security)',
    enacted: 'Enacted: August 14, 2025',
    updated: 'Last Updated: August 14, 2025'
  }
};

export default function PrivacyPage() {
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
                  <p className="text-gray-700">
                    「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、メールアドレス、お名前、会社名など、当該情報に含まれる記述等により特定の個人を識別できる情報を指します。
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article2Title}</h2>
                  <p className="text-gray-700 mb-4">
                    当社は、ユーザーが利用登録をする際にメールアドレス、お名前、会社名などの個人情報をお尋ねすることがあります。決済処理については、第三者決済サービス（Stripe等）を利用しており、当社は決済に関する機密情報を直接収集・保存することはありません。
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article3Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article4Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。</li>
                    <li>利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article5Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article6Title}</h2>
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
                  <h2 className="text-2xl font-bold mb-4">{t.article7Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、当社が定める手続きにより、当社に対して個人情報の訂正、追加または削除（以下「訂正等」といいます。）を請求することができます。</li>
                    <li>当社は、ユーザーから前項の請求を受けてその請求に理由があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。</li>
                    <li>当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article8Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」といいます。）を求められた場合には、遅滞なく必要な調査を行います。</li>
                    <li>前項の調査結果に基づき、その請求に理由があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。</li>
                    <li>当社は、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、遅滞なく、これをユーザーに通知します。</li>
                    <li>前2項にかかわらず、利用停止等に多額の費用を有する場合その他利用停止等を行うことが困難な場合であって、ユーザーの権利利益を保護するために必要なこれに代わるべき措置をとれる場合は、この代替策を講じるものとします。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article9Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>当社は、本サービスにおいて、Cookie及び類似技術を利用します。これらの技術により、当社はユーザーのアクセス状況を分析し、本サービスの改善や、ユーザーにとってより有用な情報を提供することができます。</li>
                    <li>Cookieを無効にする方法やCookieに関する詳細については、各ブラウザのヘルプ機能をご確認ください。ただし、Cookieを無効にすると本サービスの一部機能がご利用いただけない場合があります。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article10Title}</h2>
                  <p className="text-gray-700 mb-4">
                    当社は、本サービスの利用状況を分析するため、Google Analytics等のアクセス解析ツールを利用しています。これらのツールはCookieを利用して情報を収集しますが、個人を特定する情報は含まれません。この機能はCookieを無効にすることで収集を拒否することができますので、お使いのブラウザの設定をご確認ください。
                  </p>
                  <p className="text-gray-700">
                    Google Analyticsの利用規約およびプライバシーポリシーについては、Google Analyticsのサイトをご確認ください。
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article11Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。</li>
                    <li>当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article12Title}</h2>
                  <p className="text-gray-700">
                    本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <p className="text-gray-700">
                      <strong>お問い合わせ先：</strong><br />
                      メールアドレス: privacy@fininfonext.com<br />
                      <span className="text-sm text-gray-600">※お問い合わせへの回答はベストエフォートベースで対応いたします。全てのお問い合わせに回答をお約束するものではありません。</span>
                    </p>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article13Title}</h2>
                  <p className="text-gray-700">
                    当社は、本サービスの提供のため、ユーザーの個人情報を日本国外にあるサーバーで処理する場合があります。この場合、当社は適切な安全管理措置を講じ、個人情報保護法その他関連法令に従って適切に取り扱います。
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article14Title}</h2>
                  <p className="text-gray-700">
                    当社は、個人情報を利用目的の達成に必要な期間に限って保存します。ただし、法令により保存が義務づけられている場合や、正当な事業上の理由がある場合には、この限りではありません。
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article15Title}</h2>
                  <p className="text-gray-700">
                    当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の適切な管理のために、適切な安全管理措置を講じます。また、個人情報を取り扱う従業者に対して、必要かつ適切な監督を行います。
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article1Title}</h2>
                  <p className="text-gray-700">
                    &quot;Personal Information&quot; refers to &quot;personal information&quot; as defined by the Personal Information Protection Act, which is information about living individuals that can identify specific individuals through descriptions contained in the information, such as email addresses, names, and company names.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article2Title}</h2>
                  <p className="text-gray-700 mb-4">
                    The Company may ask for personal information such as email addresses, names, and company names when users register. For payment processing, the Company uses third-party payment services (such as Stripe), and does not directly collect or store confidential information related to payments.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article3Title}</h2>
                  <p className="text-gray-700 mb-4">The purposes for which the Company collects and uses personal information are as follows:</p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>To provide and operate the Company&apos;s services</li>
                    <li>To respond to inquiries from users (including identity verification)</li>
                    <li>To send emails about new features, updates, campaigns, and other services provided by the Company</li>
                    <li>To communicate as necessary, such as for maintenance and important notices</li>
                    <li>To identify users who violate the Terms of Service or attempt to use the Service for illegal or improper purposes, and to refuse their use</li>
                    <li>To allow users to view, change, or delete their registration information and usage status</li>
                    <li>To bill users for usage fees in paid services</li>
                    <li>Purposes incidental to the above purposes of use</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article4Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company shall change the purpose of use of personal information only when it is reasonably recognized that the purpose of use is related to the purpose before the change.</li>
                    <li>If the purpose of use is changed, the changed purpose shall be notified to users or publicly announced on this website by the method prescribed by the Company.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article5Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company will not provide personal information to third parties without obtaining the user&apos;s prior consent, except in the following cases. However, this does not apply to cases permitted by the Personal Information Protection Act and other laws and regulations.
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>When it is necessary for the protection of human life, body, or property and it is difficult to obtain the consent of the person</li>
                        <li>When it is particularly necessary for improving public health or promoting the sound growth of children and it is difficult to obtain the consent of the person</li>
                        <li>When cooperation is necessary for a national or local government agency or a person entrusted by them to carry out affairs prescribed by law, and obtaining the consent of the person may hinder the performance of such affairs</li>
                        <li>When the following items are announced or publicized in advance and the Company has notified the Personal Information Protection Commission:
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>The purpose of use includes provision to third parties</li>
                            <li>Items of data provided to third parties</li>
                            <li>Means or methods of provision to third parties</li>
                            <li>Stopping the provision of personal information to third parties upon the request of the person</li>
                            <li>Method of accepting requests from the person</li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                    <li>Notwithstanding the provisions of the preceding paragraph, the recipient of such information shall not be considered a third party in the following cases:
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>When the Company outsources all or part of the handling of personal information within the scope necessary to achieve the purpose of use</li>
                        <li>When personal information is provided in connection with business succession due to merger or other reasons</li>
                        <li>When personal information is used jointly with a specific person, and the fact, the items of personal information to be used jointly, the scope of persons who will use it jointly, the purpose of use by the persons who will use it, and the name or title of the person responsible for managing such personal information are notified to the person in advance or are made easily accessible to the person</li>
                      </ul>
                    </li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article6Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>When the Company is requested by a person to disclose personal information, it shall disclose it to the person without delay. However, if the disclosure falls under any of the following, all or part of it may not be disclosed, and if a decision is made not to disclose, the Company shall notify the person without delay.
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>When there is a risk of harming the life, body, property, or other rights and interests of the person or a third party</li>
                        <li>When there is a risk of significantly hindering the proper implementation of the Company&apos;s business</li>
                        <li>In other cases where it would violate laws and regulations</li>
                      </ul>
                    </li>
                    <li>Notwithstanding the provisions of the preceding paragraph, information other than personal information, such as history information and characteristic information, will not be disclosed in principle.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article7Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>If the personal information held by the Company is incorrect, users may request the Company to correct, add, or delete (hereinafter referred to as &quot;correction, etc.&quot;) the personal information by following the procedures prescribed by the Company.</li>
                    <li>If the Company receives a request from a user as described in the preceding paragraph and determines that there are reasonable grounds for the request, it shall make corrections, etc., to the personal information without delay.</li>
                    <li>The Company shall notify the user without delay when corrections, etc., are made based on the provisions of the preceding paragraph, or when a decision is made not to make corrections, etc.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article8Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>If the Company is requested by a person to suspend or delete (hereinafter referred to as &quot;suspension of use, etc.&quot;) the use of personal information on the grounds that the personal information is being handled beyond the scope of the purpose of use or that it has been obtained by fraudulent means, the Company shall conduct necessary investigations without delay.</li>
                    <li>Based on the results of the investigation in the preceding paragraph, if it is determined that there are reasonable grounds for the request, the Company shall suspend the use, etc., of the personal information without delay.</li>
                    <li>The Company shall notify the user without delay when suspension of use, etc., is performed based on the provisions of the preceding paragraph, or when a decision is made not to suspend the use, etc.</li>
                    <li>Notwithstanding the preceding two paragraphs, if suspension of use, etc., involves a large amount of expense or if it is otherwise difficult to suspend the use, etc., and alternative measures necessary to protect the rights and interests of the user can be taken, these alternative measures shall be taken.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article9Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The Company uses cookies and similar technologies in the Service. These technologies enable the Company to analyze user access status, improve the Service, and provide more useful information to users.</li>
                    <li>For information on how to disable cookies and other details about cookies, please check the help function of your browser. However, please note that disabling cookies may prevent you from using some features of the Service.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article10Title}</h2>
                  <p className="text-gray-700 mb-4">
                    The Company uses access analysis tools such as Google Analytics to analyze the usage status of the Service. These tools collect information using cookies, but do not include information that identifies individuals. This function can be refused by disabling cookies, so please check your browser settings.
                  </p>
                  <p className="text-gray-700">
                    For information on the terms of use and privacy policy of Google Analytics, please refer to the Google Analytics website.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article11Title}</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>The content of this Policy may be changed without notice to users, except for matters stipulated by laws and regulations or otherwise in this Policy.</li>
                    <li>Unless otherwise specified by the Company, the changed Privacy Policy shall become effective when posted on this website.</li>
                  </ol>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article12Title}</h2>
                  <p className="text-gray-700">
                    For inquiries regarding this Policy, please contact the following:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <p className="text-gray-700">
                      <strong>Contact:</strong><br />
                      Email: privacy@fininfonext.com<br />
                      <span className="text-sm text-gray-600">※We will respond to inquiries on a best-effort basis. We do not guarantee a response to all inquiries.</span>
                    </p>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article13Title}</h2>
                  <p className="text-gray-700">
                    The Company may process users&apos; personal information on servers located outside of Japan for the purpose of providing the Service. In such cases, the Company shall take appropriate security measures and handle the information appropriately in accordance with the Personal Information Protection Act and other related laws and regulations.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article14Title}</h2>
                  <p className="text-gray-700">
                    The Company shall store personal information only for the period necessary to achieve the purpose of use. However, this does not apply when storage is required by law or when there is a legitimate business reason.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{t.article15Title}</h2>
                  <p className="text-gray-700">
                    The Company shall take appropriate security measures for the proper management of personal information, including preventing leakage, loss, or damage. The Company shall also provide necessary and appropriate supervision to employees who handle personal information.
                  </p>
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
