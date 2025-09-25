'use client';

import { useState } from 'react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'このサービスは投資助言を提供しますか？',
      answer: 'いいえ、当サービスは投資助言業ではありません。財務データの分析ツールとして情報提供のみを行っており、具体的な投資判断や推奨は行いません。投資に関する最終的な判断は、必ずお客様ご自身の責任で行ってください。'
    },
    {
      question: 'どのようなデータが取得できますか？',
      answer: '日本の上場企業の有価証券報告書から抽出した財務データ、業績指標、企業情報などを提供しています。すべてのデータは公開情報に基づいています。'
    },
    {
      question: 'APIの利用制限はありますか？',
      answer: 'フリーミアムプランでは直近１年間のデータアクセス、スタンダードプランではすべてのデータアクセス利用可能です。'
    },
    {
      question: 'データの正確性は保証されますか？',
      answer: '公開されている有価証券報告書に基づいてデータを提供していますが、データの正確性や完全性について保証するものではありません。重要な投資判断の際は、必ず一次情報をご確認ください。'
    },
    {
      question: 'どの企業のデータが利用できますか？',
      answer: '東証プライム、スタンダード、グロース市場に上場している企業のデータを提供しています。対象企業は定期的に更新されます。'
    },
    {
      question: '商用利用は可能ですか？',
      answer: 'はい、商用利用が可能です。ただし、取得したデータを第三者に販売した損害。または、AI分析結果に基づく損害について当社は一切の責任を負いかねます。'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            よくある質問
          </h2>
          <p className="text-xl text-gray-600">
            XBRL Financial APIについてのよくある質問にお答えします
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 cursor-pointer"
              >
                <span className="font-semibold text-gray-900">
                  {faq.question}
                </span>
                <i className={`ri-arrow-${openIndex === index ? 'up' : 'down'}-s-line text-gray-500 text-xl`}></i>
              </button>

              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}