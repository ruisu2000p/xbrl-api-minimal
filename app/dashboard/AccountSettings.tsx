'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ApiKey } from '@/types/api-key';
import ApiKeyDisplay from '@/components/ApiKeyDisplay';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { supabase } from '@/app/auth/AuthContext';

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
          <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={profile.email}
            onChange={(event) => onChange('email', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-gray-700">ユーザー名</label>
          <input
            id="profile-name"
            name="name"
            type="text"
            value={profile.name}
            onChange={(event) => onChange('name', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="田中太郎"
            autoComplete="name"
          />
        </div>
      </section>

      <div>
        <label htmlFor="profile-company" className="mb-2 block text-sm font-medium text-gray-700">会社名</label>
        <input
          id="profile-company"
          name="company"
          type="text"
          value={profile.company}
          onChange={(event) => onChange('company', event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="株式会社サンプル"
          autoComplete="organization"
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
            <label htmlFor="api-key-name" className="mb-2 block text-sm font-medium text-gray-700">新しいAPIキー名</label>
            <input
              id="api-key-name"
              name="apiKeyName"
              type="text"
              value={newKeyName}
              onChange={(event) => onChangeName(event.target.value)}
              placeholder="例: Production Key"
              autoComplete="off"
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
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{key.name}</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                      アクティブ
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-gray-500 md:flex-row md:items-center md:gap-4">
                    <span>作成: {key.created}</span>
                    <span>最終使用: {key.lastUsed}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCopy(key.key)}
                    className="flex items-center space-x-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <i className="ri-file-copy-line"></i>
                    <span>コピー</span>
                  </button>
                  <button
                    onClick={() => onDelete(key.id)}
                    className="flex items-center space-x-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                  >
                    <i className="ri-delete-bin-line"></i>
                    <span>削除</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 新規アカウントの場合はAPIキータブを初期表示
  const isNewAccount = searchParams.get('newAccount') === 'true';
  const initialTab = isNewAccount ? 'api' : 'profile';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
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

  // 認証状態
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // ダイアログ関連の状態
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    const checkAuth = async () => {
      
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('❌ 認証されていません。ログインページへリダイレクトします。');
        router.push('/auth/login');
      } else {
        setIsAuthenticated(true);
      }
      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const loadApiKeys = useCallback(async () => {
    setApiStatus('loading');
    setApiMessage(null);

    try {
      

      // Supabase認証を確認
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log('❌ セッションが存在しません');
        setApiStatus('error');
        setApiMessage({ type: 'error', text: 'ログインが必要です。' });
        return;
      }

      const accessToken = session.access_token;

      console.log('📡 APIキー取得開始:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!accessToken,
        tokenPreview: accessToken?.substring(0, 20) + '...'
      });

      // 現在のセッション確認
      const currentSession = await supabase.auth.getSession();
      console.log('🔍 Current session check:', {
        hasSession: !!currentSession.data.session,
        hasToken: !!currentSession.data.session?.access_token,
        tokenPrefix: currentSession.data.session?.access_token?.substring(0, 30)
      });

      if (!currentSession.data.session?.access_token) {
        console.error('❌ No JWT token available in session');
        setApiMessage({ type: 'error', text: '認証セッションが見つかりません。再度ログインしてください。' });
        setApiStatus('error');
        return;
      }

      // supabase.functions.invokeのみを使用（JWTを自動付与）
      console.log('🔧 Using supabase.functions.invoke (POST with explicit method)...');

      // Edge Functionは'list'アクションをURLパスで受け取る
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('api-key-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: { action: 'list' }
      });

      console.log('📨 Invoke result:', { data: invokeData, error: invokeError });

      if (invokeError) {
        console.error('❌ Invoke error:', invokeError);
        throw new Error(invokeError.message || 'Failed to invoke API key manager');
      }

      if (!invokeData) {
        throw new Error('No data returned from API key manager');
      }

      console.log('✅ Invoke succeeded:', invokeData);

      if (!invokeData?.success) {
        throw new Error(invokeData?.error || 'Failed to fetch API keys');
      }

      const apiKeys = invokeData.keys || [];
      console.log('✅ Loaded API keys:', apiKeys);

      const formattedKeys: ApiKey[] = (apiKeys || []).map((key: any) => ({
        id: key.id,
        name: key.name,
        key: key.key_prefix ? `${key.key_prefix}****` : `api_key****${key.id.slice(-4)}`,
        created: new Date(key.created_at).toLocaleDateString('ja-JP'),
        lastUsed: key.last_used_at
          ? new Date(key.last_used_at).toLocaleDateString('ja-JP')
          : '未使用',
        tier: (key.tier || 'free') as ApiKey['tier']
      }));

      setApiKeys(formattedKeys);
      setApiStatus('ready');
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setApiStatus('error');
      setApiMessage({ type: 'error', text: 'APIキーの読み込みに失敗しました。' });
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
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 APIキー作成ボタンクリック開始');
      console.log('📝 入力されたキー名:', newKeyName);
    }
    
    if (newKeyName.trim().length === 0) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ キー名が空のため処理を中止');
      }
      return;
    }

    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ 作成処理を開始...');
    }
    setIsCreatingKey(true);
    setApiMessage(null);
    setGeneratedKey(null);

    try {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Supabaseクライアントを取得中...');
      }
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Supabaseクライアント取得完了');
      }

      // 認証状態を確認
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 認証状態を確認中...');
      }

      // 本番環境ではSupabase認証、開発環境ではlocalstorage認証をサポート
      let userId: string | null = null;
      let userEmail: string | null = null;

      // まずSupabase認証を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session?.user) {
        // Supabase認証が有効な場合
        userId = session.user.id;
        userEmail = session.user.email || null;
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Supabase認証セッション有効:', { userId, email: userEmail });
        }
      } else {
        // Supabase認証が無効な場合、localStorage認証を確認（開発環境用）
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUser = localStorage.getItem('currentUser');

        if (isAuthenticated === 'true' && currentUser) {
          try {
            const userData = JSON.parse(currentUser);

            // UUID形式チェック（古いIDの場合は新しいUUIDを生成）
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userData.id)) {
              // eslint-disable-next-line no-console
              console.warn('⚠️ 古い形式のユーザーID検出:', userData.id);

              // 新しいUUID形式のIDを生成
              const generateUUID = () => {
                // Use crypto.randomUUID if available
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                  return crypto.randomUUID();
                }
                // Fallback to crypto.getRandomValues for older browsers
                const array = new Uint8Array(16);
                crypto.getRandomValues(array);
                array[6] = (array[6] & 0x0f) | 0x40; // Version 4
                array[8] = (array[8] & 0x3f) | 0x80; // Variant bits
                const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
              };

              userData.id = generateUUID();
              // 更新したデータを保存
              localStorage.setItem('currentUser', JSON.stringify(userData));

              // eslint-disable-next-line no-console
              console.log('✅ 新しいUUID形式のIDを生成:', userData.id);
            }

            userId = userData.id;
            userEmail = userData.email;
            // eslint-disable-next-line no-console
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ localStorage認証有効:', { userId, email: userEmail });
            }
          } catch (e) {
            console.error('❌ localStorage認証データが無効:', e);
          }
        }
      }

      if (!userId || !userEmail) {
        console.error('❌ 認証セッションが存在しません (Supabase + localStorage両方とも無効)');
        setApiMessage({ type: 'error', text: 'ログインが必要です。認証ページにリダイレクトします。' });
        setIsCreatingKey(false);
        // 3秒後に認証ページにリダイレクト
        setTimeout(() => {
          window.location.href = '/auth';
        }, 3000);
        return;
      }
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 認証OK - ユーザーID:', userId);
        console.log('📝 キー名:', newKeyName);
      }

      // Edge Function経由でAPIキーを作成（supabase.functions.invoke使用）
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 supabase.functions.invoke api-key-manager (create)を呼び出し中...');
        console.log('📋 パラメータ:', {
          action: 'create',
          key_name: newKeyName.trim(),
          tier: 'free'
        });
      }

      const { data: result, error: invokeError } = await supabase.functions.invoke('api-key-manager', {
        body: {
          action: 'create',
          key_name: newKeyName.trim(),
          tier: 'free'
        }
      });

      if (invokeError) {
        console.error('❌ APIキー作成失敗:', invokeError);
        throw new Error(invokeError.message || 'APIキーの作成に失敗しました');
      }

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📨 Edge Function実行結果:', result);
      }

      if (!result.success) {
        console.error('❌ APIキー作成失敗:', result);
        setApiMessage({ type: 'error', text: result?.error || 'APIキーの作成に失敗しました。' });
        setIsCreatingKey(false);
        return;
      }

      // 新規作成時は newKey フィールドに平文キーが含まれる
      // 一覧取得時は keys 配列にメタ情報のみ
      const newApiKey = result.newKey || result.api_key || result.apiKey;

      if (!newApiKey) {
        console.error('❌ APIキー作成失敗 - 新規キーが返されませんでした:', result);
        setApiMessage({ type: 'error', text: 'APIキーの作成に失敗しました。' });
        setIsCreatingKey(false);
        return;
      }

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🎉 APIキー作成成功!');
        console.log('🔑 作成されたキー情報:', {
          key_id: result.key_id || result.keyId,
          name: result.name,
          tier: result.tier,
          api_key_length: newApiKey.length
        });
      }

      const keyId = result.key_id || result.keyId;

      const newKey: ApiKey = {
        id: keyId,
        name: result.name,
        key: newApiKey, // 作成時のみ完全なキーを表示
        created: new Date().toLocaleDateString('ja-JP'),
        lastUsed: '未使用',
        tier: (result.tier || 'free') as ApiKey['tier']
      };

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 フォーマット済みキー情報:', newKey);
      }

      setApiKeys((prev) => {
        const updated = [...prev, newKey];
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('📚 更新後のAPIキーリスト:', updated);
        }
        return updated;
      });
      
      setGeneratedKey(newApiKey);
      setNewKeyName('');
      setApiMessage({ type: 'success', text: '新しいAPIキーを作成しました。' });
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 状態更新完了');
      }
    } catch (error) {
      console.error('💥 予期しないエラー:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('🔍 エラースタック:', error instanceof Error ? error.stack : 'スタックなし');
      }
      setApiMessage({ type: 'error', text: 'APIキーの作成に失敗しました。' });
    }

    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 作成処理終了 - ローディング状態をfalseに');
    }
    setIsCreatingKey(false);
  }, [newKeyName]);;;;

  const handleDeleteKey = useCallback((id: string) => {
    setDeleteKeyId(id);
  }, []);

  const confirmDeleteKey = useCallback(async () => {
    if (!deleteKeyId) return;

    try {
      

      // 本番環境ではSupabase認証、開発環境ではlocalstorage認証をサポート
      let userId: string | null = null;

      // まずSupabase認証を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session?.user) {
        // Supabase認証が有効な場合
        userId = session.user.id;
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ Supabase認証で削除:', userId);
        }
      } else {
        // Supabase認証が無効な場合、localStorage認証を確認（開発環境用）
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUser = localStorage.getItem('currentUser');

        if (isAuthenticated === 'true' && currentUser) {
          try {
            const userData = JSON.parse(currentUser);
            userId = userData.id;
            // eslint-disable-next-line no-console
            if (process.env.NODE_ENV === 'development') {
              console.log('🗑️ localStorage認証で削除:', userId);
            }
          } catch (e) {
            console.error('❌ localStorage認証データが無効:', e);
          }
        }
      }

      if (!userId) {
        setApiMessage({ type: 'error', text: 'ログインが必要です。' });
        setDeleteKeyId(null);
        return;
      }

      // 現在のセッションを再取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        setApiMessage({ type: 'error', text: 'ログインが必要です。' });
        setDeleteKeyId(null);
        return;
      }

      // Edge Function経由でAPIキーを削除（supabase.functions.invoke使用）
      const { data: result, error: invokeError } = await supabase.functions.invoke('api-key-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          action: 'delete',
          key_id: deleteKeyId
        }
      });

      if (invokeError) {
        console.error('❌ APIキー削除失敗:', invokeError);
        setApiMessage({ type: 'error', text: invokeError.message || 'APIキーの削除に失敗しました。' });
      } else if (!result?.success) {
        console.error('❌ APIキー削除失敗:', result);
        setApiMessage({ type: 'error', text: result?.error || 'APIキーの削除に失敗しました。' });
      } else {
        setApiKeys((prev) => prev.filter((key) => key.id !== deleteKeyId));
        setApiMessage({ type: 'success', text: 'APIキーを削除しました。' });
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setApiMessage({ type: 'error', text: 'APIキーの削除に失敗しました。' });
    }

    setDeleteKeyId(null);
  }, [deleteKeyId]);

  const handleCopyKey = useCallback((value: string) => {
    void navigator.clipboard.writeText(value);
    setApiMessage({ type: 'success', text: 'APIキーをコピーしました。' });
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutDialog(false);
    router.push('/login');
  }, [router]);

  const activeTabLabel = useMemo(() => TABS.find((tab) => tab.id === activeTab)?.label ?? '', [activeTab]);

  // 削除対象のAPIキー名を取得（ダイアログ表示用）
  const deleteKeyName = useMemo(() => {
    if (!deleteKeyId) return '';
    const key = apiKeys.find(k => k.id === deleteKeyId);
    return key?.name || '';
  }, [deleteKeyId, apiKeys]);

  // 認証チェック中の表示
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-2xl bg-white shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合の表示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-2xl bg-white shadow-lg">
        <div className="text-center space-y-4">
          <i className="ri-lock-line text-4xl text-gray-400"></i>
          <p className="text-gray-600">ログインが必要です</p>
          <p className="text-sm text-gray-500">リダイレクト中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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

      {/* APIキー削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteKeyId !== null}
        title="APIキーの削除"
        message={`APIキー「${deleteKeyName}」を削除しますか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon="danger"
        onConfirm={confirmDeleteKey}
        onCancel={() => setDeleteKeyId(null)}
      />

      {/* ログアウト確認ダイアログ */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="ログアウト"
        message="ログアウトしてもよろしいですか？"
        confirmText="ログアウト"
        cancelText="キャンセル"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon="warning"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}
