'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: 'warning' | 'danger' | 'info' | 'success';
}

export default function ConfirmDialog({
  isOpen,
  title = '確認',
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
  onConfirm,
  onCancel,
  icon = 'warning'
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // フォーカスをダイアログ内に移動
      dialogRef.current?.focus();
      // 背景スクロールを無効化
      document.body.style.overflow = 'hidden';
    } else {
      // 背景スクロールを有効化
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconConfig = {
    warning: {
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      icon: 'ri-error-warning-line'
    },
    danger: {
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: 'ri-error-warning-fill'
    },
    info: {
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: 'ri-information-line'
    },
    success: {
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: 'ri-checkbox-circle-line'
    }
  };

  const { bgColor, iconColor, icon: iconClass } = iconConfig[icon];

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* ダイアログ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-slideIn"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="rounded-2xl bg-white shadow-2xl">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgColor}`}>
                <i className={`${iconClass} text-xl ${iconColor}`}></i>
              </div>
              <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="閉じる"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* メッセージ */}
          <div className="px-6 py-6">
            <p id="confirm-dialog-message" className="text-sm text-gray-600">
              {message}
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}