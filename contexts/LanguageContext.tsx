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
  },
  en: {
    'nav.pricing': 'Pricing',
    'nav.docs': 'Documentation',
    'nav.login': 'Login',
    'nav.signup': 'Get Started',
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