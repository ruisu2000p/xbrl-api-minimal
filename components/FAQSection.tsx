'use client';

import { useState } from 'react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'どのような企業のデータが利用可能ですか？',
      answer: '東京証券取引所に上場している全企業（プライム、スタンダード、グロース市場）約3,800社のデータが利用可能です。製造業、サービス業、金融業など、あらゆる業界をカバーしています。'
    },
    {
      question: 'データの更新頻度はどの程度ですか？',
      answer: '有価証券報告書の提出に合わせて、更新しております。'
    },
    {
      question: 'API利用制限はありますか？',
      answer: 'フリーミアムプランでは直近１年間のデータアクセスが可能です。スタンダードプランでは、すべてのデータアクセスが可能になっております。'
    },
    {
      question: 'どの言語に対応していますか？',
      answer: 'APIレスポンスは日本語と英語の両方に対応しています。企業名や業界名などは両言語で提供され、財務データの項目名も英日両対応です。'
    },
    {
      question: 'セキュリティ対策について教えてください',
      answer: 'すべての通信はHTTPS暗号化され、APIキー認証によるアクセス制御を実装しています。また、定期的なセキュリティ監査を実施し、SOC2準拠の体制を構築しています。'
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

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            他にご質問がございますか？
          </p>
          <button className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
            お問い合わせはこちら →
          </button>
        </div>
      </div>
    </section>
  );
}