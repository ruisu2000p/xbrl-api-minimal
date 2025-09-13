'use client';

import { useState } from 'react';

interface SimpleLoginProps {
  onLogin: (email: string) => void;
}

export default function SimpleLogin({ onLogin }: SimpleLoginProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }
    
    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    // メールアドレスをLocalStorageに保存
    const userData = {
      id: email.replace('@', '_').replace('.', '_'),
      email: email,
      plan: 'beta',
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
    onLogin(email);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          XBRL API ダッシュボード
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ダッシュボードに入る
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            または
          </p>
          <button
            onClick={() => {
              const demoData = {
                id: 'demo',
                email: 'demo@example.com',
                plan: 'beta',
                createdAt: new Date().toISOString()
              };
              localStorage.setItem('user', JSON.stringify(demoData));
              onLogin('demo@example.com');
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            デモアカウントで続行
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            メールアドレスはAPIキーの管理に使用されます。<br/>
            パスワードは不要です。
          </p>
        </div>
      </div>
    </div>
  );
}