'use client';

export default function QuickActions() {
  const actions = [
    {
      title: 'データ取得',
      description: '企業の財務データを検索',
      icon: 'ri-search-2-line',
      color: 'blue',
      href: '/search'
    },
    {
      title: 'レポート作成',
      description: '新しい分析レポートを生成',
      icon: 'ri-file-add-line',
      color: 'green',
      href: '/reports/new'
    },
    {
      title: 'アラート設定',
      description: '株価変動の通知を設定',
      icon: 'ri-notification-2-line',
      color: 'purple',
      href: '/settings/alerts'
    },
    {
      title: 'APIドキュメント',
      description: 'API仕様を確認',
      icon: 'ri-book-open-line',
      color: 'orange',
      href: '/docs'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`p-4 rounded-xl text-left transition-colors cursor-pointer ${getColorClasses(action.color)}`}
          >
            <div className="flex flex-col space-y-2">
              <i className={`${action.icon} text-2xl`}></i>
              <div>
                <h4 className="font-medium text-sm">{action.title}</h4>
                <p className="text-xs opacity-75 mt-1">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}