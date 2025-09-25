'use client';

interface DataChartProps {
  selectedPeriod: string;
}

export default function DataChart({ selectedPeriod }: DataChartProps) {
  const getPeriodLabel = (period: string) => {
    const labels = {
      '7days': '過去7日間',
      '30days': '過去30日間', 
      '90days': '過去90日間',
      '1year': '過去1年間'
    };
    return labels[period as keyof typeof labels] || '過去7日間';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">API使用量推移</h3>
        <span className="text-sm text-gray-500">{getPeriodLabel(selectedPeriod)}</span>
      </div>
      
      <div className="relative h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 flex items-end justify-between">
        {/* グラフの棒 */}
        {[
          { day: '月', value: 85, requests: 425 },
          { day: '火', value: 92, requests: 460 },
          { day: '水', value: 78, requests: 390 },
          { day: '木', value: 95, requests: 475 },
          { day: '金', value: 88, requests: 440 },
          { day: '土', value: 65, requests: 325 },
          { day: '日', value: 72, requests: 360 }
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center space-y-2 group cursor-pointer">
            <div className="relative">
              <div 
                className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500"
                style={{ height: `${item.value * 2.5}px` }}
              ></div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.requests}件
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{item.day}</span>
          </div>
        ))}
        
        {/* Y軸ラベル */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-8">
          <span>500</span>
          <span>400</span>
          <span>300</span>
          <span>200</span>
          <span>100</span>
          <span>0</span>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-gray-600">API リクエスト数</span>
        </div>
      </div>
    </div>
  );
}