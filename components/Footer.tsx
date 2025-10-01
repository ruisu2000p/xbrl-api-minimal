'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Bottom section */}
        <div className="pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="text-sm text-gray-400">
                {t('footer.copyright')}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.privacy')}
                </Link>
                <span className="text-gray-600">|</span>
                <Link href="/legal" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.legal')}
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/ruisu2000p/xbrl-api-minimal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200 cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-github-line text-xl"></i>
                <span className="text-sm">{t('footer.github')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}