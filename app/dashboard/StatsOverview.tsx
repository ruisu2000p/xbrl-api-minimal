'use client';

export default function StatsOverview() {
  const stats = [
    {
      title: '総企業数',
      value: '1,256',
      change: '+12',
      changeType: 'increase',
      icon: 'ri-building-line',
      description: '監視中の上場企業'
    },
    {
      title: 'APIコール',
      value: '45,231',
      change: '+8.2%',
      changeType: 'increase',
      icon: 'ri-bar-chart-line',
      description: '今月の総リクエスト数'
    },
    {
      title: 'データ更新',
      value: '98.5%',
      change: '+0.3%',
      changeType: 'increase',
      icon: 'ri-refresh-line',
      description: 'リアルタイム同期率'
    },
    {
      title: 'アラート',
      value: '24',
      change: '-3',
      changeType: 'decrease',
      icon: 'ri-notification-3-line',
      description: '未確認の通知'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${
              index === 0 ? 'from-blue-400 to-blue-600' :
              index === 1 ? 'from-green-400 to-green-600' :
              index === 2 ? 'from-purple-400 to-purple-600' :
              'from-orange-400 to-orange-600'
            }`}>
              <i className={`${stat.icon} text-white text-xl`}></i>
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              stat.changeType === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {stat.change}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
          <p className="text-sm text-gray-600 font-medium mb-2">{stat.title}</p>
          <p className="text-xs text-gray-500">{stat.description}</p>
        </div>
      ))}
    </div>
  );
}