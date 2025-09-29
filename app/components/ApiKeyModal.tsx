'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

interface ApiKeyModalProps {
  apiKey: string;
  onClose: () => void;
}

export function ApiKeyModal({ apiKey, onClose }: ApiKeyModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleContinue = () => {
    onClose();
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg">
            <i className="ri-shield-keyhole-line text-white text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('apiKeyModal.title')}
          </h2>
          <p className="text-gray-600">
            {t('apiKeyModal.subtitle')}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700">
              <i className="ri-key-2-line mr-2"></i>
              {t('apiKeyModal.yourKey')}
            </label>
            {copied && (
              <span className="text-sm text-green-600 font-medium">
                <i className="ri-checkbox-circle-line mr-1"></i>
                {t('apiKeyModal.copied')}
              </span>
            )}
          </div>

          <div className="relative">
            <div className="bg-white rounded-xl p-4 pr-14 font-mono text-sm text-gray-800 break-all border border-gray-200">
              {apiKey}
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              aria-label={t('apiKeyModal.copyButton')}
            >
              <i className={`${copied ? 'ri-checkbox-line' : 'ri-file-copy-line'} text-sm`}></i>
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <i className="ri-alert-line text-amber-600 text-xl mt-0.5"></i>
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">{t('apiKeyModal.warning.title')}</p>
              <ul className="space-y-1 text-gray-700">
                <li>{t('apiKeyModal.warning.item1')}</li>
                <li>{t('apiKeyModal.warning.item2')}</li>
                <li>{t('apiKeyModal.warning.item3')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleContinue}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center"
          >
            <i className="ri-arrow-right-line mr-2"></i>
            {t('apiKeyModal.continue')}
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center"
          >
            <i className="ri-file-copy-line mr-2"></i>
            {t('apiKeyModal.copy')}
          </button>
        </div>
      </div>
    </div>
  );
}