'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Download, 
  Filter,
  Search,
  ExternalLink,
  Bell,
  Wifi,
  WifiOff,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Key,
  Activity,
  TrendingUp,
  Users,
  Zap
} from 'react-feather';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';

// 型定義
interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  plan?: string;
  apiKey?: string;
  createdAt?: string;
}

interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  remainingQuota: number;
  quotaLimit: number;
  lastRequestAt?: string | null;
  averageResponseTime: number;
  uptime: number;
  errorsByEndpoint: Record<string, number>;
  requestsByHour: Array<{ hour: string; requests: number; errors: number }>;
}

interface RecentActivity {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  timestamp: string;
  responseTime: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt: string;
  isActive: boolean;
  usageCount: number;
}

interface UsageData {
  date: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

interface EndpointUsage {
  endpoint: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  uptime: number;
  errorRate: number;
  requestsPerMinute: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'quickstart' | 'activity' | 'keys' | 'notifications'>('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [endpointUsage, setEndpointUsage] = useState<EndpointUsage[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityFilter, setActivityFilter] = useState<{
    status: string;
    endpoint: string;
    dateRange: { start: string; end: string };
  }>({ status: 'all', endpoint: 'all', dateRange: { start: '', end: '' } });
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      checkAuth(),
      fetchStats(),
      fetchApiKeys(),
      fetchRecentActivities(),
      fetchUsageData(),
      fetchEndpointUsage(),
      fetchPerformanceMetrics(),
      fetchNotifications()
    ]);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchAllData();
    
    // LocalStorageから保存された完全なAPIキーを確認
    const savedApiKey = localStorage.getItem('currentApiKey');
    if (savedApiKey) {
      setFullApiKey(savedApiKey);
    }

    // オンライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAllData]);

  // 自動更新の設定
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (autoRefresh && isOnline) {
      intervalRef.current = setInterval(() => {
        fetchAllData();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isOnline, fetchAllData]);

  async function checkAuth() {
    // まずLocalStorageを確認
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setUser(userData);
      setLoading(false);
      return;
    }

    // LocalStorageにない場合は、デフォルトユーザーを設定
    const defaultUser = {
      id: '1',
      email: 'pumpkin3020@gmail.com',
      name: 'ユーザー',
      plan: 'beta',
      createdAt: new Date().toISOString()
    };
    
    setUser(defaultUser);
    localStorage.setItem('user', JSON.stringify(defaultUser));
    setLoading(false);
  }

  async function fetchStats() {
    try {
      // デモデータを使用（本番環境では実際のAPIを呼び出す）
      const now = new Date();
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        requests: Math.floor(Math.random() * 50) + 10,
        errors: Math.floor(Math.random() * 5)
      }));

      setStats({
        totalRequests: 342,
        successfulRequests: 338,
        failedRequests: 4,
        remainingQuota: 658,
        quotaLimit: 1000,
        lastRequestAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        averageResponseTime: 210,
        uptime: 99.8,
        errorsByEndpoint: {
          '/api/v1/companies': 1,
          '/api/v1/companies/[id]': 2,
          '/api/v1/search': 1
        },
        requestsByHour: hourlyData
      });
    } catch (error) {
      console.error('Stats fetch failed:', error);
      setStats({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        remainingQuota: 1000,
        quotaLimit: 1000,
        lastRequestAt: null,
        averageResponseTime: 0,
        uptime: 0,
        errorsByEndpoint: {},
        requestsByHour: []
      });
    }
  }

  async function fetchApiKeys() {
    try {
      // デモAPIキーを設定
      const demoKeys: ApiKey[] = [
        {
          id: '1',
          name: 'Production Key',
          key: 'xbrl_live_a1b2c3d4e5f6g7h8i9j0',
          permissions: ['read', 'write'],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          usageCount: 342
        },
        {
          id: '2',
          name: 'Development Key',
          key: 'xbrl_dev_b2c3d4e5f6g7h8i9j0k1',
          permissions: ['read'],
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          usageCount: 25
        }
      ];
      
      setApiKeys(demoKeys);
      const primaryKey = demoKeys[0];
      setFullApiKey(primaryKey.key);
      
      if (user) {
        setUser({
          ...user,
          apiKey: `${primaryKey.key.substring(0, 10)}...${primaryKey.key.substring(primaryKey.key.length - 4)}`
        });
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }

  async function fetchRecentActivities() {
    // デモデータ（拡張版）
    const endpoints = ['/api/v1/companies', '/api/v1/companies/7203', '/api/v1/companies/8411', '/api/v1/search', '/api/v1/financial-data'];
    const methods = ['GET', 'POST'];
    const statuses = [200, 201, 400, 404, 500];
    const userAgents = ['Mozilla/5.0...', 'PostmanRuntime/7.29.2', 'Python/3.9 requests/2.25.1'];
    
    const activities: RecentActivity[] = Array.from({ length: 50 }, (_, i) => {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      return {
        id: `${i + 1}`,
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        status,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        responseTime: Math.floor(Math.random() * 2000) + 50,
        errorMessage: status >= 400 ? 'エラーが発生しました' : undefined,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: userAgents[Math.floor(Math.random() * userAgents.length)]
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setRecentActivities(activities);
  }

  async function fetchUsageData() {
    // 過去30日間のデータ
    const data: UsageData[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: format(date, 'MM/dd'),
        requests: Math.floor(Math.random() * 100) + 20,
        errors: Math.floor(Math.random() * 10),
        avgResponseTime: Math.floor(Math.random() * 500) + 100
      };
    });
    setUsageData(data);
  }

  async function fetchEndpointUsage() {
    const data: EndpointUsage[] = [
      { endpoint: '/api/v1/companies', requests: 1250, errors: 12, avgResponseTime: 185 },
      { endpoint: '/api/v1/companies/[id]', requests: 890, errors: 8, avgResponseTime: 165 },
      { endpoint: '/api/v1/search', requests: 445, errors: 15, avgResponseTime: 320 },
      { endpoint: '/api/v1/financial-data', requests: 332, errors: 5, avgResponseTime: 280 },
      { endpoint: '/api/v1/documents', requests: 198, errors: 3, avgResponseTime: 150 }
    ];
    setEndpointUsage(data);
  }

  async function fetchPerformanceMetrics() {
    setPerformanceMetrics({
      averageResponseTime: 210,
      p95ResponseTime: 850,
      uptime: 99.8,
      errorRate: 1.2,
      requestsPerMinute: 12.5
    });
  }

  async function fetchNotifications() {
    const notifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'API使用量警告',
        message: 'APIの使用量が月間制限の80%に達しました。',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: '2',
        type: 'info',
        title: 'メンテナンス予定',
        message: '2024年8月20日 2:00-4:00にメンテナンスを実施予定です。',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/maintenance'
      },
      {
        id: '3',
        type: 'success',
        title: '新機能リリース',
        message: '企業検索APIに新しいフィルター機能が追加されました。',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/docs/search'
      }
    ];
    setNotifications(notifications);
  }

  async function generateNewApiKey(name?: string, permissions?: string[]) {
    setIsGeneratingKey(true);
    try {
      // デモ: 新しいAPIキーを生成
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newKey = `xbrl_live_${Math.random().toString(36).substring(2, 15)}`;
      const newApiKey: ApiKey = {
        id: Date.now().toString(),
        name: name || `API Key ${apiKeys.length + 1}`,
        key: newKey,
        permissions: permissions || ['read'],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        usageCount: 0
      };
      
      setApiKeys(prev => [newApiKey, ...prev]);
      setFullApiKey(newKey);
      localStorage.setItem('currentApiKey', newKey);
      
      if (user) {
        setUser({
          ...user,
          apiKey: `${newKey.substring(0, 10)}...${newKey.substring(newKey.length - 4)}`
        });
      }
      alert('新しいAPIキーが生成されました。このキーは一度だけ表示されます。');
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('APIキーの生成に失敗しました。');
    } finally {
      setIsGeneratingKey(false);
    }
  }

  async function revokeApiKey(keyId: string) {
    try {
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, isActive: false } : key
      ));
      alert('APIキーが無効化されました。');
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('APIキーの無効化に失敗しました。');
    }
  }

  const exportActivityLogs = async () => {
    setIsExporting(true);
    try {
      const filteredActivities = getFilteredActivities();
      const csvContent = [
        ['timestamp', 'method', 'endpoint', 'status', 'responseTime', 'ipAddress'].join(','),
        ...filteredActivities.map(activity => [
          activity.timestamp,
          activity.method,
          activity.endpoint,
          activity.status,
          activity.responseTime,
          activity.ipAddress || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('ログのエクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ));
  };

  const getFilteredActivities = () => {
    return recentActivities.filter(activity => {
      const matchesStatus = activityFilter.status === 'all' || 
        (activityFilter.status === 'success' && activity.status >= 200 && activity.status < 300) ||
        (activityFilter.status === 'error' && activity.status >= 400) ||
        activity.status.toString() === activityFilter.status;
      
      const matchesEndpoint = activityFilter.endpoint === 'all' || 
        activity.endpoint.includes(activityFilter.endpoint);
      
      const matchesSearch = !searchQuery || 
        activity.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.method.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDateRange = true;
      if (activityFilter.dateRange.start && activityFilter.dateRange.end) {
        const activityDate = new Date(activity.timestamp);
        const startDate = new Date(activityFilter.dateRange.start);
        const endDate = new Date(activityFilter.dateRange.end);
        matchesDateRange = activityDate >= startDate && activityDate <= endDate;
      }
      
      return matchesStatus && matchesEndpoint && matchesSearch && matchesDateRange;
    });
  };

  const getPaginatedActivities = () => {
    const filtered = getFilteredActivities();
    const startIndex = (activityPage - 1) * activityPageSize;
    const endIndex = startIndex + activityPageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredActivities().length / activityPageSize);
  };

  const getConnectionStatus = () => {
    if (!isOnline) return { status: 'offline', color: 'text-red-500', icon: WifiOff };
    if (stats && stats.uptime > 99) return { status: 'excellent', color: 'text-green-500', icon: Wifi };
    if (stats && stats.uptime > 95) return { status: 'good', color: 'text-yellow-500', icon: Wifi };
    return { status: 'poor', color: 'text-red-500', icon: WifiOff };
  };

  const copyApiKey = (key?: string) => {
    const keyToCopy = key || fullApiKey || user?.apiKey;
    if (keyToCopy) {
      navigator.clipboard.writeText(keyToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getUsagePercentage = () => {
    if (!stats) return 0;
    return ((stats.quotaLimit - stats.remainingQuota) / stats.quotaLimit) * 100;
  };

  const getSuccessRate = () => {
    if (!stats || stats.totalRequests === 0) return 100;
    return (stats.successfulRequests / stats.totalRequests) * 100;
  };

  // 過去7日間のデータ（デモ用）
  const getLast7DaysData = () => {
    return [15, 23, 38, 45, 52, 48, stats?.totalRequests || 0];
  };

  const getWeeklyData = () => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek });
    
    return days.map(day => ({
      day: format(day, 'MM/dd', { locale: ja }),
      requests: Math.floor(Math.random() * 100) + 20,
      errors: Math.floor(Math.random() * 10),
      isToday: isToday(day)
    }));
  };

  const getHourlyUsageData = () => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      requests: Math.floor(Math.random() * 50) + 5,
      errors: Math.floor(Math.random() * 5),
      avgResponseTime: Math.floor(Math.random() * 500) + 100
    }));
  };

  const getEndpointUsageChartData = () => {
    return endpointUsage.map((endpoint, index) => ({
      ...endpoint,
      fill: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
    }));
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const getRateLimitWarning = () => {
    if (!stats) return null;
    const usagePercentage = ((stats.quotaLimit - stats.remainingQuota) / stats.quotaLimit) * 100;
    if (usagePercentage >= 90) return { level: 'danger', message: 'API制限の90%に達しています' };
    if (usagePercentage >= 80) return { level: 'warning', message: 'API制限の80%に達しています' };
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span className="hidden sm:inline">XBRL財務データAPI</span>
                <span className="sm:hidden">XBRL API</span>
              </Link>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <span className="text-gray-600 font-medium text-sm sm:text-base">ダッシュボード</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                href="/docs" 
                className="hidden sm:block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                ドキュメント
              </Link>
              <Link 
                href="/examples" 
                className="hidden sm:block text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                サンプル
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.name || '未設定'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    プロフィール
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    設定
                  </Link>
                  <hr className="my-1" />
                  <button 
                    onClick={() => {
                      localStorage.removeItem('user');
                      localStorage.removeItem('currentApiKey');
                      router.push('/');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ウェルカムセクション */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            こんにちは、{user.name || user.email.split('@')[0]}さん
          </h2>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>

        {/* ステータスバー */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                {(() => {
                  const { status, color, icon: Icon } = getConnectionStatus();
                  return (
                    <>
                      <Icon className={`w-5 h-5 ${color}`} />
                      <span className={`text-sm font-medium ${color}`}>
                        {status === 'offline' ? 'オフライン' : 'オンライン'}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>最終更新: {formatDistanceToNow(lastUpdated, { locale: ja, addSuffix: true })}</span>
              </div>
              {getRateLimitWarning() && (
                <div className={`flex items-center space-x-2 text-sm ${
                  getRateLimitWarning()?.level === 'danger' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>{getRateLimitWarning()?.message}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">自動更新:</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1"
                  disabled={!autoRefresh}
                >
                  <option value={10}>10秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>1分</option>
                  <option value={300}>5分</option>
                </select>
              </div>
              <button
                onClick={fetchAllData}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">更新</span>
              </button>
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <button 
            onClick={() => router.push('/docs')}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">ドキュメント</h3>
            </div>
          </button>

          <button 
            onClick={() => window.open(`${window.location.origin}/api/test`, '_blank')}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors mb-2">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">APIテスト</h3>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('activity')}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">ログ</h3>
            </div>
          </button>

          <button 
            onClick={exportActivityLogs}
            disabled={isExporting}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group disabled:opacity-50"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors mb-2">
                <Download className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{isExporting ? 'エクスポート中...' : 'エクスポート'}</h3>
            </div>
          </button>

          <button 
            onClick={() => router.push('/examples')}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors mb-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">SDK</h3>
            </div>
          </button>

          <button 
            onClick={() => router.push('/support')}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors mb-2">
                <Users className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">サポート</h3>
            </div>
          </button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              {stats && stats.totalRequests > 0 && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  今月
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalRequests.toLocaleString() || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">API呼び出し</p>
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              12% 前月比
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-semibold">
                {getSuccessRate().toFixed(1)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.successfulRequests.toLocaleString() || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">成功リクエスト</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${getSuccessRate()}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs text-gray-600">
                平均
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.averageResponseTime || 0}ms</h3>
            <p className="text-sm text-gray-600 mt-1">応答時間</p>
            <div className="mt-2 text-xs text-gray-500">
              P95: {performanceMetrics?.p95ResponseTime || 0}ms
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wifi className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                99.8%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.uptime?.toFixed(1) || '99.8'}%</h3>
            <p className="text-sm text-gray-600 mt-1">稼働率</p>
            <div className="mt-2 text-xs text-green-600">
              ✓ サービス正常
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">
                {user.plan === 'beta' ? 'ベータ' : user.plan || 'Free'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.remainingQuota.toLocaleString() || 1000}</h3>
            <p className="text-sm text-gray-600 mt-1">残りAPI回数</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  getRateLimitWarning()?.level === 'danger' ? 'bg-red-500' :
                  getRateLimitWarning()?.level === 'warning' ? 'bg-yellow-500' : 'bg-orange-500'
                }`} 
                style={{ width: `${(stats?.remainingQuota || 1000) / (stats?.quotaLimit || 1000) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>概要</span>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>使用状況</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>アクティビティ</span>
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'keys'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>APIキー</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 relative ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>通知</span>
              {getUnreadNotificationCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getUnreadNotificationCount()}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'quickstart'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>クイックスタート</span>
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* APIキー情報 */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">APIキー情報</h3>
                  <button
                    onClick={() => generateNewApiKey()}
                    disabled={isGeneratingKey}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {isGeneratingKey ? '生成中...' : '新しいキーを生成'}
                  </button>
                </div>
                
                {fullApiKey || user.apiKey ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        あなたのAPIキー
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={fullApiKey || user.apiKey || ''}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          {showApiKey ? '隠す' : '表示'}
                        </button>
                        <button
                          onClick={() => copyApiKey()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          {copied ? '✓ コピー済み' : 'コピー'}
                        </button>
                      </div>
                      {!fullApiKey && user.apiKey && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ マスクされたキーのみ表示されています。完全なキーを取得するには、新しいAPIキーを生成してください。
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">作成日</p>
                        <p className="font-medium">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '本日'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">有効期限</p>
                        <p className="font-medium">
                          {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">環境</p>
                        <p className="font-medium">Production</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ステータス</p>
                        <p className="font-medium text-green-600">● アクティブ</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-gray-600 mb-4">APIキーがまだ発行されていません</p>
                    <button
                      onClick={() => generateNewApiKey()}
                      disabled={isGeneratingKey}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isGeneratingKey ? '生成中...' : 'APIキーを発行する'}
                    </button>
                  </div>
                )}
              </div>

              {/* アカウント情報 */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">プラン</p>
                    <p className="font-medium text-lg">{user.plan === 'beta' ? 'ベータプラン' : user.plan || 'Free'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">月間制限</p>
                    <p className="font-medium">{stats?.quotaLimit.toLocaleString() || '1,000'}回</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">メールアドレス</p>
                    <p className="font-medium text-sm">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">会社名</p>
                    <p className="font-medium">{user.company || '未設定'}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <Link
                      href="/dashboard/billing"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      プランをアップグレード →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* 使用状況概要 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">過去30日間のトレンド</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>リクエスト</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>エラー</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" fontSize={12} stroke="#666" />
                        <YAxis fontSize={12} stroke="#666" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="requests" 
                          stackId="1" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.6}
                          name="リクエスト"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="errors" 
                          stackId="2" 
                          stroke="#EF4444" 
                          fill="#EF4444" 
                          fillOpacity={0.6}
                          name="エラー"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">使用状況サマリー</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">今月の使用率</span>
                      <span className="font-medium">{getUsagePercentage().toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">平均レスポンス時間</span>
                      <span className="font-medium">{stats?.averageResponseTime || 210}ms</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">エラー率</span>
                      <span className="font-medium text-red-600">{stats && stats.totalRequests > 0 ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">稼働率</span>
                      <span className="font-medium text-green-600">{stats?.uptime?.toFixed(1) || '99.8'}%</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-600">最終利用</span>
                      <span className="font-medium text-sm">
                        {stats?.lastRequestAt ? formatDistanceToNow(new Date(stats.lastRequestAt), { locale: ja, addSuffix: true }) : '未使用'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 時間別使用パターン */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">時間別使用パターン (今日)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getHourlyUsageData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" fontSize={12} stroke="#666" />
                      <YAxis fontSize={12} stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="requests" fill="#3B82F6" name="リクエスト" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* エンドポイント別使用状況 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">エンドポイント別使用状況</h3>
                  <div className="space-y-3">
                    {endpointUsage.map((endpoint, index) => (
                      <div key={endpoint.endpoint} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{endpoint.endpoint}</div>
                          <div className="text-xs text-gray-500">
                            {endpoint.requests.toLocaleString()} リクエスト · {endpoint.avgResponseTime}ms 平均
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{endpoint.requests}</div>
                          {endpoint.errors > 0 && (
                            <div className="text-xs text-red-600">{endpoint.errors} エラー</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">エンドポイント別使用分布</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getEndpointUsageChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="requests"
                        >
                          {getEndpointUsageChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* フィルターとコントロール */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">APIアクティビティログ</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="エンドポイントを検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-48"
                      />
                    </div>
                    <button
                      onClick={exportActivityLogs}
                      disabled={isExporting}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">{isExporting ? 'エクスポート中...' : 'CSV出力'}</span>
                    </button>
                  </div>
                </div>
                
                {/* フィルター */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={activityFilter.status}
                      onChange={(e) => setActivityFilter(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="all">すべて</option>
                      <option value="success">成功 (2xx)</option>
                      <option value="400">400エラー</option>
                      <option value="404">404エラー</option>
                      <option value="500">500エラー</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">エンドポイント</label>
                    <select
                      value={activityFilter.endpoint}
                      onChange={(e) => setActivityFilter(prev => ({ ...prev, endpoint: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="all">すべて</option>
                      <option value="/api/v1/companies">企業一覧</option>
                      <option value="/api/v1/companies/[id]">企業詳細</option>
                      <option value="/api/v1/search">検索</option>
                      <option value="/api/v1/financial-data">財務データ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input
                      type="date"
                      value={activityFilter.dateRange.start}
                      onChange={(e) => setActivityFilter(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                    <input
                      type="date"
                      value={activityFilter.dateRange.end}
                      onChange={(e) => setActivityFilter(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* アクティビティテーブル */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">時刻</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">メソッド</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">エンドポイント</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">応答時間</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">IPアドレス</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">詳細</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedActivities().map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {format(new Date(activity.timestamp), 'MM/dd HH:mm:ss', { locale: ja })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              activity.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                              activity.method === 'POST' ? 'bg-green-100 text-green-700' :
                              activity.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {activity.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-700 max-w-xs truncate">
                            {activity.endpoint}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              activity.status >= 200 && activity.status < 300 ? 'bg-green-100 text-green-700' :
                              activity.status >= 400 && activity.status < 500 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {activity.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            <span className={`${
                              activity.responseTime > 1000 ? 'text-red-600 font-medium' :
                              activity.responseTime > 500 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {activity.responseTime}ms
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 font-mono">
                            {activity.ipAddress}
                          </td>
                          <td className="py-3 px-4">
                            {activity.errorMessage && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600 truncate max-w-20" title={activity.errorMessage}>
                                  エラー
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {getPaginatedActivities().length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">条件に一致するアクティビティが見つかりません</p>
                  </div>
                )}

                {/* ページネーション */}
                {getTotalPages() > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                        disabled={activityPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => setActivityPage(Math.min(getTotalPages(), activityPage + 1))}
                        disabled={activityPage === getTotalPages()}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        次へ
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          {((activityPage - 1) * activityPageSize) + 1} - {Math.min(activityPage * activityPageSize, getFilteredActivities().length)} / {getFilteredActivities().length} 件
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={activityPageSize}
                          onChange={(e) => {
                            setActivityPageSize(Number(e.target.value));
                            setActivityPage(1);
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10件</option>
                          <option value={25}>25件</option>
                          <option value={50}>50件</option>
                        </select>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                          <button
                            onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                            disabled={activityPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setActivityPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                  pageNum === activityPage
                                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setActivityPage(Math.min(getTotalPages(), activityPage + 1))}
                            disabled={activityPage === getTotalPages()}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quickstart' && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">クイックスタートガイド</h3>
              <div className="flex items-center space-x-2">
                <Link
                  href="/docs"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>完全ドキュメント</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">1. 企業リストを取得</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">2. 特定企業のデータ取得</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies/7203`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">3. 財務データ検索</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`curl -X POST -H "X-API-Key: ${fullApiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"year": 2022, "sector": "電気機器"}' \\
  https://api.xbrl.jp/v1/search`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">4. Python サンプル</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <pre className="text-green-400">
{`import requests

headers = {'X-API-Key': '${fullApiKey || 'YOUR_API_KEY'}'}
response = requests.get(
  'https://api.xbrl.jp/v1/companies',
  headers=headers
)
print(response.json())`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Link
                  href="/docs"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  完全なドキュメントを見る
                </Link>
                <Link
                  href="/examples"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  サンプルコード
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-6">
              {/* APIキー管理ヘッダー */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">APIキー管理</h3>
                  <p className="text-sm text-gray-600 mt-1">APIキーの作成、管理、使用状況の監視</p>
                </div>
                <button
                  onClick={() => generateNewApiKey()}
                  disabled={isGeneratingKey}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4 sm:mt-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isGeneratingKey ? '生成中...' : '新しいAPIキーを作成'}</span>
                </button>
              </div>

              {/* APIキー一覧 */}
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{apiKey.name}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            apiKey.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {apiKey.isActive ? 'アクティブ' : '無効'}
                          </span>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            {apiKey.permissions.map((permission) => (
                              <span key={permission} className="bg-gray-100 px-2 py-1 rounded">
                                {permission === 'read' ? '読み取り' : permission === 'write' ? '書き込み' : permission}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-4">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={showApiKey ? apiKey.key : '•'.repeat(40)}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                          />
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">作成日:</span>
                            <div className="font-medium">{format(new Date(apiKey.createdAt), 'yyyy/MM/dd', { locale: ja })}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">最終使用:</span>
                            <div className="font-medium">
                              {apiKey.lastUsedAt ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { locale: ja, addSuffix: true }) : '未使用'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">使用回数:</span>
                            <div className="font-medium">{apiKey.usageCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">有効期限:</span>
                            <div className="font-medium">{format(new Date(apiKey.expiresAt), 'yyyy/MM/dd', { locale: ja })}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            const newName = prompt('新しい名前を入力してください:', apiKey.name);
                            if (newName && newName !== apiKey.name) {
                              setApiKeys(prev => prev.map(key => 
                                key.id === apiKey.id ? { ...key, name: newName } : key
                              ));
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="名前を変更"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {apiKey.isActive && (
                          <button
                            onClick={() => {
                              if (confirm('このAPIキーを無効化しますか？この操作は元に戻せません。')) {
                                revokeApiKey(apiKey.id);
                              }
                            }}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors"
                            title="APIキーを無効化"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">通知</h3>
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  すべて既読にする
                </button>
              </div>
              
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all ${
                      !notification.read ? 'ring-2 ring-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          notification.type === 'info' ? 'bg-blue-100' :
                          notification.type === 'warning' ? 'bg-yellow-100' :
                          notification.type === 'error' ? 'bg-red-100' :
                          'bg-green-100'
                        }`}>
                          {notification.type === 'info' && <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                          {notification.type === 'error' && <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">{notification.title}</h4>
                          <p className="text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDistanceToNow(new Date(notification.timestamp), { locale: ja, addSuffix: true })}</span>
                            {!notification.read && (
                              <span className="flex items-center space-x-1 text-blue-600">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span>未読</span>
                              </span>
                            )}
                          </div>
                          {notification.actionUrl && (
                            <Link
                              href={notification.actionUrl}
                              className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                            >
                              <span>詳細を見る</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">通知がありません</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* パフォーマンス情報 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">システムパフォーマンス</h4>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">平均応答時間</span>
                <span className="text-sm font-medium">{performanceMetrics?.averageResponseTime || 210}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">P95応答時間</span>
                <span className="text-sm font-medium">{performanceMetrics?.p95ResponseTime || 850}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">1分あたりリクエスト</span>
                <span className="text-sm font-medium">{performanceMetrics?.requestsPerMinute || 12.5}/min</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">システム状態</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">稼働率</span>
                <span className="text-sm font-medium text-green-600">{performanceMetrics?.uptime || 99.8}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">エラー率</span>
                <span className="text-sm font-medium text-red-600">{performanceMetrics?.errorRate || 1.2}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">サービス状態</span>
                <span className="text-sm font-medium text-green-600">正常</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">今月の利用統計</h4>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">総リクエスト数</span>
                <span className="text-sm font-medium">{stats?.totalRequests?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">成功率</span>
                <span className="text-sm font-medium text-green-600">{getSuccessRate().toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">残りクォータ</span>
                <span className="text-sm font-medium">{stats?.remainingQuota?.toLocaleString() || '1000'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* お知らせセクション */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">🎉 ベータ版をご利用いただきありがとうございます</h3>
              <p className="text-blue-100">
                正式版リリース時には、ベータ参加者限定の特別価格でご利用いただけます。リアルタイム更新、高度な分析機能、優先サポートをお楽しみください。
              </p>
            </div>
            <Link
              href="/feedback"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              フィードバックを送る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}