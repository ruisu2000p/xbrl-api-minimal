'use client';

import { useState, useEffect } from 'react';

interface UserWithApiKey {
  user_id: string;
  email: string;
  created_at: string;
  api_keys: {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    revoked: boolean;
    created_at: string;
    last_used_at: string | null;
  }[];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserWithApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  function authenticateAdmin() {
    if (adminPassword === 'admin2025xbrl') {
      setIsAuthenticated(true);
      fetchAllUsers();
    } else {
      alert('管理者パスワードが正しくありません');
    }
  }

  async function fetchAllUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'X-Admin-Key': 'admin2025xbrl' },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">管理者ログイン</h1>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && authenticateAdmin()}
            placeholder="管理者パスワード"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            onClick={authenticateAdmin}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            管理者ログイン
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4">
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
      </header>
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="メールで検索..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">メール</th>
                <th className="text-left py-2">APIキー</th>
                <th className="text-left py-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                user.api_keys.map(key => (
                  <tr key={key.id} className="border-b">
                    <td className="py-2">{user.email}</td>
                    <td className="py-2 font-mono text-sm">{key.key_prefix}...</td>
                    <td className="py-2">
                      {key.revoked ? 
                        <span className="text-red-600">無効</span> : 
                        <span className="text-green-600">有効</span>
                      }
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
