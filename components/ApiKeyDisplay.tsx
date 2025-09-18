'use client';

import React, { useState } from 'react';

interface ApiKeyDisplayProps {
  apiKey: string;
  keyId: string;
  onCopy?: (key: string) => void;
}

export default function ApiKeyDisplay({ apiKey, keyId, onCopy }: ApiKeyDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // APIキーが省略形式の場合はそのまま表示
  const isShortFormat = apiKey && apiKey.includes('...');

  // マスキング表示用の関数
  const getMaskedKey = () => {
    if (!apiKey) return '';
    if (isShortFormat) {
      // 省略形式の場合はそのまま返す
      return apiKey;
    }
    // 完全なキーの場合、最初と最後の8文字以外を●でマスク
    if (apiKey.length <= 16) return apiKey;
    const start = apiKey.substring(0, 12);
    const end = apiKey.substring(apiKey.length - 4);
    const masked = '●'.repeat(apiKey.length - 16);
    return `${start}${masked}${end}`;
  };

  const displayKey = isVisible || isShortFormat ? apiKey : getMaskedKey();

  const handleCopy = async () => {
    if (isShortFormat) {
      // 省略形式の場合は完全なキーを取得する必要がある
      alert('完全なAPIキーは発行時のみ確認可能です。新しいAPIキーを発行してください。');
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);

      // コールバック実行
      if (onCopy) {
        onCopy(apiKey);
      }

      // 3秒後にコピー状態をリセット
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('コピーに失敗しました');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className={`
        flex-1 break-all rounded-lg px-4 py-3 text-sm font-mono
        ${isShortFormat ? 'bg-gray-50 text-gray-500' : 'bg-gray-50 text-gray-800'}
      `}>
        {displayKey}
      </code>

      <div className="flex gap-2">
        {!isShortFormat && (
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            title={isVisible ? 'APIキーを隠す' : 'APIキーを表示'}
            aria-label={isVisible ? 'Hide API key' : 'Show API key'}
          >
            <i className={`ri-${isVisible ? 'eye-off' : 'eye'}-line text-gray-600`}></i>
          </button>
        )}

        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
            ${copied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
            }
            ${isShortFormat ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={isShortFormat}
          title={isShortFormat ? '完全なAPIキーは発行時のみ確認可能です' : 'APIキーをコピー'}
        >
          <i className={`ri-${copied ? 'check' : 'file-copy'}-line`}></i>
          <span className="text-sm font-medium">
            {copied ? 'コピーしました' : 'コピー'}
          </span>
        </button>
      </div>
    </div>
  );
}