'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState('pumpkin3020@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('繝代せ繝ｯ繝ｼ繝峨′荳閾ｴ縺励∪縺帙ｓ');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('繝代せ繝ｯ繝ｼ繝峨・8譁・ｭ嶺ｻ･荳翫↓縺励※縺上□縺輔＞');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '繝代せ繝ｯ繝ｼ繝峨Μ繧ｻ繝・ヨ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error) {
      setLoading(false);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('莠域悄縺励↑縺・お繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                繝代せ繝ｯ繝ｼ繝峨ｒ譖ｴ譁ｰ縺励∪縺励◆
              </h2>
              <p className="text-gray-600 mb-2">
                譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝峨〒繝ｭ繧ｰ繧､繝ｳ縺ｧ縺阪∪縺・              </p>
              <p className="text-sm text-gray-500">
                3遘貞ｾ後↓繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｸ繝ｪ繝繧､繝ｬ繧ｯ繝医＠縺ｾ縺・..
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI
          </h1>
          <p className="text-gray-600">邂｡逅・・畑繝代せ繝ｯ繝ｼ繝峨Μ繧ｻ繝・ヨ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝・              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="8譁・ｭ嶺ｻ･荳・
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                繝代せ繝ｯ繝ｼ繝会ｼ育｢ｺ隱搾ｼ・              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ蜀榊・蜉・
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '譖ｴ譁ｰ荳ｭ...' : '繝代せ繝ｯ繝ｼ繝峨ｒ譖ｴ譁ｰ'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              縺薙・繝壹・繧ｸ縺ｯ邂｡逅・・畑縺ｧ縺吶・br />
              騾壼ｸｸ縺ｮ繝代せ繝ｯ繝ｼ繝峨Μ繧ｻ繝・ヨ縺ｯ
              <a href="/forgot-password" className="text-blue-600 hover:underline ml-1">
                縺薙■繧・              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
