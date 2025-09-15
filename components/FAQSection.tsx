'use client';

import { useState } from 'react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'どのような企業のデータが利用できますか？',
      answer: '日本の上場企業5,220社の有価証券報告書データにアクセスできます。東証プライム、スタンダード、グロース市場に上場している企業の財務情報を網羅しています。'
    },
    {
      question: 'データはどのくらいの頻度で更新されますか？',
      answer: '企業の有価証券報告書が提出され次第、リアルタイムでデータベースに反映されます。四半期報告書や年次報告書の提出タイミングに合わせて最新の財務情報をご利用いただけます。'
    },
    {
      question: 'APIの利用制限はありますか？',
      answer: 'プランによって異なりますが、無料プランでは直近1年間のデータに100リクエスト/分の制限があります。有料プランではより多くのリクエストと全履歴データへのアクセスが可能です。'
    },
    {
      question: 'どのプログラミング言語から利用できますか？',
      answer: 'RESTful APIなので、HTTP通信ができるすべてのプログラミング言語から利用可能です。Python、JavaScript、Java、C#、Go、Ruby等の主要言語でのサンプルコードも提供しています。'
    },
    {
      question: 'Claude Desktop MCPとは何ですか？',
      answer: 'Model Context Protocol (MCP) により、Claude DesktopからXBRL APIに直接アクセスできる統合機能です。npmパッケージをインストールするだけで、Claudeを通じて財務データの分析が可能になります。'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-violet-100/20 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full mb-6">
            <span className="text-indigo-700 text-sm font-medium">💡 よくある質問</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              FAQ
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            サービスに関するよくある質問にお答えします
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="backdrop-blur-md bg-white/80 border border-gray-200 shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-gray-50/50 transition-all duration-300"
              >
                <span className="font-semibold text-gray-800 pr-4">{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-5 h-5 text-gray-500 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-8 pb-6 text-gray-600 leading-relaxed animate-in slide-in-from-top-2">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">さらに質問がある場合は</p>
          <a
            href="/support"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            サポートに問い合わせる
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}