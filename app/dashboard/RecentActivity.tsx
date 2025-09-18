'use client';

export default function RecentActivity() {
  const activities = [
    {
      type: 'api_request',
      title: '企業情報取得',
      description: 'トヨタ自動車の財務データを取得しました',
      time: '2分前',
      icon: 'ri-download-cloud-line',
      color: 'blue'
    },
    {
      type: 'report',
      title: 'レポート生成完了',
      description: '月次分析レポートが生成されました',
      time: '15分前',
      icon: 'ri-file-chart-line',
      color: 'green'
    },
    {
      type: 'alert',
      title: 'アラート通知',
      description: 'ソフトバンクGの株価が5%以上変動しました',
      time: '1時間前',
      icon: 'ri-alarm-warning-line',
      color: 'orange'
    },
    {
      type: 'api_request',
      title: 'データ同期',
      description: '156社の最新財務データを同期しました',
      time: '2時間前',
      icon: 'ri-refresh-line',
      color: 'purple'
    },
    {
      type: 'user',
      title: 'プロファイル更新',
      description: 'アラート設定を変更しました',
      time: '3時間前',
      icon: 'ri-user-settings-line',
      color: 'gray'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      orange: 'bg-orange-50 text-orange-600',
      purple: 'bg-purple-50 text-purple-600',
      gray: 'bg-gray-50 text-gray-600'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">最近のアクティビティ</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
          すべて表示
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorClasses(activity.color)}`}>
              <i className={`${activity.icon} text-lg`}></i>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
            </div>
            
            <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}