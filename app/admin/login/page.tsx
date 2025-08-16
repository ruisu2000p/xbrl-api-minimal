'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      // 繝医・繧ｯ繝ｳ繧剃ｿ晏ｭ・      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      // 邂｡逅・・ム繝・す繝･繝懊・繝峨∈繝ｪ繝繧､繝ｬ繧ｯ繝・      router.push('/admin');
    } catch (err: any) {
      setError(err.message || '繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-900 font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">邂｡逅・・Ο繧ｰ繧､繝ｳ</h1>
          <p className="text-sm text-gray-600 mt-2">XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI 邂｡逅・さ繝ｳ繧ｽ繝ｼ繝ｫ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="admin@example.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              繝代せ繝ｯ繝ｼ繝・            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="窶｢窶｢窶｢窶｢窶｢窶｢窶｢窶｢"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '繝ｭ繧ｰ繧､繝ｳ荳ｭ...' : '繝ｭ繧ｰ繧､繝ｳ'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
            竊・繝｡繧､繝ｳ繧ｵ繧､繝医↓謌ｻ繧・          </a>
        </div>

        {/* 邂｡逅・・い繧ｫ繧ｦ繝ｳ繝域ュ蝣ｱ */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">邂｡逅・・い繧ｫ繧ｦ繝ｳ繝茨ｼ・/p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-1">
            繝｡繝ｼ繝ｫ: admin@xbrl-api.com
          </code>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
            繝代せ繝ｯ繝ｼ繝・ Admin@2024#XBRL
          </code>
        </div>
      </div>
    </div>
  );
}
