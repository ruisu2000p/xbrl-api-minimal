'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserApiKeys, createApiKey, deleteApiKey } from '@/app/actions/auth';
import type { ApiKey } from '@/types/api-key';
import ApiKeyDisplay from '@/components/ApiKeyDisplay';

type TabId = 'profile' | 'plan' | 'api';

type Message = {
  type: 'success' | 'error';
  text: string;
} | null;

type ProfileState = {
  email: string;
  name: string;
  company: string;
};

type ApiState = 'idle' | 'loading' | 'ready' | 'error';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'profile', label: 'プロフィール', icon: 'ri-user-line' },
  { id: 'plan', label: 'プラン管理', icon: 'ri-vip-crown-line' },
  { id: 'api', label: 'APIキー', icon: 'ri-key-line' }
];

// デフォルトの現在プラン
const DEFAULT_CURRENT_PLAN = {
  id: 'standard',
  name: 'スタンダード',
  price: '¥2,980/月',
  nextBilling: '2024-02-15',
  status: 'アクティブ'
};

const PLAN_OPTIONS = [
  {
    id: 'freemium',
    name: 'フリーミアム',
    price: '¥0/月',
    description: '個人投資家や検証用途向け',
    highlights: ['直近1年間の財務データ', '月間5,000リクエスト', '標準サポート'],
    recommended: false
  },
  {
    id: 'standard',
    name: 'スタンダード',
    price: '¥2,980/月',
    description: '本番利用向けの標準プラン',
    highlights: ['全期間の財務データ', 'APIリクエスト無制限', '優先サポート', 'レポート生成機能'],
    recommended: true
  }
] as const;

// 請求履歴は実際のデータを取得するか、空の状態で表示
const BILLING_HISTORY: Array<{date: string; amount: string; status: string}> = [];

// プロフィールの初期値（実際のユーザー情報で上書きされる）
const INITIAL_PROFILE: ProfileState = {
  email: '',
  name: '',
  company: ''
};

interface ProfileTabProps {
  profile: ProfileState;
  message: Message;
  onChange: (field: keyof ProfileState, value: string) => void;
  onSave: () => void;
}

function ProfileTab({ profile, message, onChange, onSave }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={profile.email}
            onChange={(event) => onChange('email', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">ユーザー名</label>
          <input
            type="text"
            value={profile.name}
            onChange={(event) => onChange('name', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="田中太郎"
          />
        </div>
      </section>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">会社名</label>
        <input
          type="text"
          value={profile.company}
          onChange={(event) => onChange('company', event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="株式会社サンプル"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          className="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
        >
          <i className="ri-save-line"></i>
          <span>変更を保存</span>
        </button>
      </div>
    </div>
  );
}

interface PlanTabProps {
  currentPlan: typeof DEFAULT_CURRENT_PLAN;
  selectedPlan: string;
  message: Message;
  onSelectPlan: (planId: string) => void;
  onUpdatePlan: () => void;
}

function PlanTab({ currentPlan, selectedPlan, message, onSelectPlan, onUpdatePlan }: PlanTabProps) {
  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <i className="ri-vip-crown-line text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
              <p className="text-blue-600">{currentPlan.price}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <i className="ri-check-line mr-1"></i>
              {currentPlan.status}
            </span>
            <span className="text-xs text-gray-600">次回請求日: {currentPlan.nextBilling}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {PLAN_OPTIONS.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          const isCurrent = plan.id === currentPlan.id;

          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className={`flex h-full flex-col rounded-2xl border p-6 text-left transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              } ${plan.recommended ? 'relative overflow-hidden' : ''}`}
            >
              {plan.recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                  おすすめ
                </span>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                  <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    現在のプラン
                  </span>
                )}
              </div>

              <div className="mt-4 text-2xl font-bold text-gray-900">{plan.price}</div>

              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-center">
                    <i className="ri-check-line mr-2 text-green-500"></i>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {isSelected ? '選択中' : 'クリックして選択'}
                </span>
                <span className={`h-4 w-4 rounded-full border ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                }`}></span>
              </div>
            </button>
          );
        })}
      </section>

      <div className="space-y-4 rounded-2xl border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900">請求履歴</h4>
        {BILLING_HISTORY.length > 0 ? (
          <ul className="space-y-3 text-sm text-gray-600">
            {BILLING_HISTORY.map((item) => (
              <li key={item.date} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span>{item.date}</span>
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">{item.amount}</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">{item.status}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">請求履歴はありません</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onUpdatePlan}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          プランを更新
        </button>
      </div>
    </div>
  );
}

interface ApiKeyTabProps {
  apiKeys: ApiKey[];
  status: ApiState;
  message: Message;
  generatedKey: string | null;
  newKeyName: string;
  isCreating: boolean;
  onReload: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onChangeName: (value: string) => void;
  onCopy: (value: string) => void;
}

function ApiKeyTab({
  apiKeys,
  status,
  message,
  generatedKey,
  newKeyName,
  isCreating,
  onReload,
  onCreate,
  onDelete,
  onChangeName,
  onCopy
}: ApiKeyTabProps) {
  const isLoading = status === 'loading' || status === 'idle';

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {generatedKey && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h4 className="text-sm font-semibold text-yellow-800">新しいAPIキー</h4>
          <p className="mt-2 text-xs text-yellow-700">⚠️ このキーは一度しか表示されません。安全な場所に保存してください。</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all rounded-lg bg-white px-4 py-3 text-sm text-gray-800 shadow-inner">{generatedKey}</code>
            <button
              onClick={() => onCopy(generatedKey)}
              className="flex items-center space-x-2 rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100"
            >
              <i className="ri-file-copy-line"></i>
              <span>コピー</span>
            </button>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">新しいAPIキー名</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(event) => onChangeName(event.target.value)}
              placeholder="例: Production Key"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onReload}
              type="button"
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <i className="ri-refresh-line"></i>
              <span>再読み込み</span>
            </button>
            <button
              onClick={onCreate}
              disabled={isCreating || newKeyName.trim().length === 0}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <i className="ri-add-line"></i>
              <span>{isCreating ? '作成中...' : 'APIキーを作成'}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">APIキー一覧</h3>
          <span className="text-sm text-gray-500">{apiKeys.length} 件</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-12 text-gray-500">
            <i className="ri-loader-4-line animate-spin text-2xl"></i>
            <span>APIキーを読み込み中...</span>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
            <i className="ri-key-line text-3xl"></i>
            <p className="mt-3 text-sm">まだAPIキーがありません。上のフォームから作成できます。</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {apiKeys.map((key) => (
              <li key={key.id} className="rounded-xl border border-gray-200 p-5 transition-colors hover:border-blue-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-gray-900">{key.name}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        key.tier === 'premium'
                          ? 'bg-purple-100 text-purple-700'
                          : key.tier === 'basic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {key.tier === 'premium' ? 'プレミアム' : key.tier === 'basic' ? 'スタンダード' : 'フリー'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>作成日: {key.created}</span>
                      <span>最終使用: {key.lastUsed}</span>
                    </div>
                    <ApiKeyDisplay
                      apiKey={key.key}
                      keyId={key.id}
                      onCopy={onCopy}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <button
                      onClick={() => onDelete(key.id)}
                      className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <i className="ri-delete-bin-line"></i>
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [profileMessage, setProfileMessage] = useState<Message>(null);

  const [selectedPlan, setSelectedPlan] = useState<string>(DEFAULT_CURRENT_PLAN.id);
  const [currentPlan, setCurrentPlan] = useState(DEFAULT_CURRENT_PLAN);
  const [planMessage, setPlanMessage] = useState<Message>(null);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiState>('idle');
  const [apiMessage, setApiMessage] = useState<Message>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    setApiStatus('loading');
    setApiMessage(null);

    const result = await getUserApiKeys();

    if (result.success && Array.isArray(result.data)) {
      setApiKeys(result.data);
      setApiStatus('ready');
    } else {
      setApiStatus('error');
      setApiMessage({ type: 'error', text: result.error ?? 'APIキーの読み込みに失敗しました。' });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'api' && apiStatus === 'idle') {
      void loadApiKeys();
    }
  }, [activeTab, apiStatus, loadApiKeys]);

  const handleProfileChange = useCallback((field: keyof ProfileState, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleProfileSave = useCallback(() => {
    setProfileMessage({ type: 'success', text: 'プロフィール情報を更新しました。' });
  }, []);

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handlePlanUpdate = useCallback(() => {
    if (selectedPlan === currentPlan.id) {
      setPlanMessage({ type: 'success', text: `既に${currentPlan.name}プランをご利用中です。` });
    } else {
      // 選択したプラン情報を取得
      const newPlan = PLAN_OPTIONS.find(p => p.id === selectedPlan);
      if (newPlan) {
        // 現在のプランを更新
        setCurrentPlan({
          id: newPlan.id,
          name: newPlan.name,
          price: newPlan.price,
          nextBilling: '2024-02-15', // 今は固定値
          status: 'アクティブ'
        });
        setPlanMessage({ type: 'success', text: 'プラン変更のリクエストを受け付けました。' });
      }
    }
  }, [selectedPlan, currentPlan]);

  const handleCreateKey = useCallback(async () => {
    if (newKeyName.trim().length === 0) return;

    setIsCreatingKey(true);
    setApiMessage(null);
    setGeneratedKey(null);

    const result = await createApiKey(newKeyName.trim());

    if (result.success && result.data && !Array.isArray(result.data)) {
      const createdKey = result.data;
      setApiKeys((prev) => [...prev, createdKey]);
      setGeneratedKey(createdKey.key);
      setNewKeyName('');
      setApiMessage({ type: 'success', text: '新しいAPIキーを作成しました。' });
    } else {
      setApiMessage({ type: 'error', text: result.error ?? 'APIキーの作成に失敗しました。' });
    }

    setIsCreatingKey(false);
  }, [newKeyName]);

  const handleDeleteKey = useCallback(async (id: string) => {
    if (!window.confirm('このAPIキーを削除しますか？')) {
      return;
    }

    const result = await deleteApiKey(id);
    if (result.success) {
      setApiKeys((prev) => prev.filter((key) => key.id !== id));
      setApiMessage({ type: 'success', text: 'APIキーを削除しました。' });
    } else {
      setApiMessage({ type: 'error', text: result.error ?? 'APIキーの削除に失敗しました。' });
    }
  }, []);

  const handleCopyKey = useCallback((value: string) => {
    void navigator.clipboard.writeText(value);
    setApiMessage({ type: 'success', text: 'APIキーをコピーしました。' });
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm('ログアウトしますか？')) {
      router.push('/login');
    }
  }, [router]);

  const activeTabLabel = useMemo(() => TABS.find((tab) => tab.id === activeTab)?.label ?? '', [activeTab]);

  return (
    <div className="rounded-2xl bg-white shadow-lg">
      <div className="border-b border-gray-200">
        <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <nav className="flex gap-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={`${tab.icon} text-base`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <i className="ri-logout-box-line"></i>
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 border-b border-gray-100 px-6 pb-4 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">{activeTabLabel}</h2>
        <p className="text-sm text-gray-500">
          {activeTab === 'profile' && 'アカウントに紐づく基本情報を管理します。'}
          {activeTab === 'plan' && '契約中のプランや請求履歴を確認し、プラン変更をリクエストできます。'}
          {activeTab === 'api' && 'APIキーの発行・管理・削除が行えます。'}
        </p>
      </div>

      <div className="px-6 pb-8 pt-2">
        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            message={profileMessage}
            onChange={handleProfileChange}
            onSave={handleProfileSave}
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            currentPlan={currentPlan}
            selectedPlan={selectedPlan}
            message={planMessage}
            onSelectPlan={handlePlanSelect}
            onUpdatePlan={handlePlanUpdate}
          />
        )}

        {activeTab === 'api' && (
          <ApiKeyTab
            apiKeys={apiKeys}
            status={apiStatus}
            message={apiMessage}
            generatedKey={generatedKey}
            newKeyName={newKeyName}
            isCreating={isCreatingKey}
            onReload={loadApiKeys}
            onCreate={handleCreateKey}
            onDelete={handleDeleteKey}
            onChangeName={setNewKeyName}
            onCopy={handleCopyKey}
          />
        )}
      </div>
    </div>
  );
}
