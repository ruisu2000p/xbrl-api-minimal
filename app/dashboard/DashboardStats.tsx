'use client';

export default function DashboardStats() {
  const stats = [
    {
      title: 'API リクエスト',
      value: '2,847',
      change: '+12.5%',
      changeType: 'increase',
      icon: 'ri-cloud-line',
      color: 'blue'
    },
    {
      title: '分析対象企業',
      value: '156',
      change: '+8.2%',
      changeType: 'increase',
      icon: 'ri-building-line',
      color: 'green'
    },
    {
      title: 'レポート生成',
      value: '43',
      change: '+24.1%',
      changeType: 'increase',
      icon: 'ri-file-chart-line',
      color: 'purple'
    },
    {
      title: 'アラート数',
      value: '7',
      change: '-15.3%',
      changeType: 'decrease',
      icon: 'ri-alarm-warning-line',
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-50',
      green: 'bg-green-500 text-green-600 bg-green-50',
      purple: 'bg-purple-500 text-purple-600 bg-purple-50',
      orange: 'bg-orange-500 text-orange-600 bg-orange-50'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const [bgColor, textColor, lightBg] = getColorClasses(stat.color).split(' ');
        
        return (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${lightBg} rounded-xl flex items-center justify-center`}>
                <i className={`${stat.icon} ${textColor} text-xl`}></i>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                stat.changeType === 'increase' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {stat.change}
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}