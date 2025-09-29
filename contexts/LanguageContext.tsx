'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ja: {
    'nav.pricing': '料金プラン',
    'nav.docs': 'ドキュメント',
    'nav.login': 'ログイン',
    'nav.signup': '無料で始める',
    'hero.badge': 'プロフェッショナル財務データAPI',
    'hero.title1': '次世代金融データ',
    'hero.title2': 'プラットフォーム',
    'hero.description1': '日本最大級のXBRL財務データベースで、企業の財務情報を瞬時に取得。',
    'hero.description2': '投資判断に必要なデータを効率的に分析できます。',
    'hero.cta.signup': '無料トライアル開始',
    'hero.cta.login': 'ログイン',
    'hero.cta.demo': 'ライブデモ',
    'hero.stat1': '3,800+',
    'hero.stat1Label': '上場企業データ',
    'hero.stat2': '有価証券報告書データ取得',
    'hero.stat2Label': '履歴データ保有',
    'faq.title': 'よくある質問',
    'faq.description': 'XBRL Financial APIについてのよくある質問にお答えします',
    'faq.q1': 'このサービスは投資助言を提供しますか？',
    'faq.a1': 'いいえ、当サービスは投資助言業ではありません。財務データの分析ツールとして情報提供のみを行っており、具体的な投資判断や推奨は行いません。投資に関する最終的な判断は、必ずお客様ご自身の責任で行ってください。',
    'faq.q2': 'どのようなデータが取得できますか？',
    'faq.a2': '日本の上場企業の有価証券報告書から抽出した財務データ、業績指標、企業情報などを提供しています。すべてのデータは公開情報に基づいています。',
    'faq.q3': 'APIの利用制限はありますか？',
    'faq.a3': 'フリーミアムプランでは直近１年間のデータアクセス、スタンダードプランではすべてのデータアクセス利用可能です。',
    'faq.q4': 'データの正確性は保証されますか？',
    'faq.a4': '公開されている有価証券報告書に基づいてデータを提供していますが、データの正確性や完全性について保証するものではありません。重要な投資判断の際は、必ず一次情報をご確認ください。',
    'faq.q5': 'どの企業のデータが利用できますか？',
    'faq.a5': '東証プライム、スタンダード、グロース市場に上場している企業のデータを提供しています。対象企業は定期的に更新されます。',
    'faq.q6': '商用利用は可能ですか？',
    'faq.a6': 'はい、商用利用が可能です。ただし、取得したデータを第三者に販売した損害。または、AI分析結果に基づく損害について当社は一切の責任を負いかねます。',
    'footer.copyright': '© 2025 Financial Information next (FIN). All rights reserved.',
    'footer.github': 'GitHub',
  },
  en: {
    'nav.pricing': 'Pricing',
    'nav.docs': 'Documentation',
    'nav.login': 'Login',
    'nav.signup': 'Get Started',
    'hero.badge': 'Professional Financial Data API',
    'hero.title1': 'Next-Generation Financial',
    'hero.title2': 'Data Platform',
    'hero.description1': 'Instantly access corporate financial information with Japan\'s largest XBRL financial database.',
    'hero.description2': 'Efficiently analyze data for informed investment decisions.',
    'hero.cta.signup': 'Start Free Trial',
    'hero.cta.login': 'Login',
    'hero.cta.demo': 'Live Demo',
    'hero.stat1': '3,800+',
    'hero.stat1Label': 'Listed Companies',
    'hero.stat2': 'Securities Report Data',
    'hero.stat2Label': 'Historical Data',
    'faq.title': 'Frequently Asked Questions',
    'faq.description': 'Answers to common questions about XBRL Financial API',
    'faq.q1': 'Does this service provide investment advice?',
    'faq.a1': 'No, this service is not an investment advisory business. We provide information only as a financial data analysis tool and do not make specific investment decisions or recommendations. Final investment decisions must be made at your own responsibility.',
    'faq.q2': 'What kind of data can I access?',
    'faq.a2': 'We provide financial data, performance indicators, and company information extracted from securities reports of listed companies in Japan. All data is based on publicly available information.',
    'faq.q3': 'Are there any API usage limits?',
    'faq.a3': 'The Freemium plan provides access to data from the past year, while the Standard plan provides access to all available data.',
    'faq.q4': 'Is data accuracy guaranteed?',
    'faq.a4': 'While we provide data based on publicly available securities reports, we do not guarantee the accuracy or completeness of the data. For important investment decisions, please always verify primary sources.',
    'faq.q5': 'Which companies\' data is available?',
    'faq.a5': 'We provide data for companies listed on the Tokyo Stock Exchange Prime, Standard, and Growth markets. Target companies are updated regularly.',
    'faq.q6': 'Is commercial use allowed?',
    'faq.a6': 'Yes, commercial use is permitted. However, we assume no responsibility for any damages resulting from selling acquired data to third parties or from AI analysis results.',
    'footer.copyright': '© 2025 Financial Information next (FIN). All rights reserved.',
    'footer.github': 'GitHub',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ja');

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'ja' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['ja']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}