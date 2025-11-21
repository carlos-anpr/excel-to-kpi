import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

interface DashboardData {
  kpis: {
    label: string;
    value: number;
    type: string;
  }[];
  charts: {
    type: string;
    title: string;
    xAxis: string;
    data: any[];
    lines?: string[];
    bars?: string[];
  }[];
  alerts?: {
    rule: string;
    count: number;
    message: string;
  }[];
}

interface DashboardViewProps {
  data: DashboardData;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Alerts Banner */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Alertas Activadas</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {data.alerts.map((alert, idx) => (
                    <li key={idx}>{alert.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium uppercase">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {data.charts.map((chart, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
            <h3 className="text-lg font-semibold mb-6 text-gray-800">{chart.title}</h3>
            <ResponsiveContainer width="100%" height="85%">
              {chart.type === 'line' ? (
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatNumber(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  {chart.lines?.map((lineKey, i) => (
                    <Line 
                      key={lineKey} 
                      type="monotone" 
                      dataKey={lineKey} 
                      stroke={`hsl(${210 + (i * 30)}, 70%, 50%)`} 
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatNumber(value)}
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  {chart.bars?.map((barKey, i) => (
                    <Bar 
                      key={barKey} 
                      dataKey={barKey} 
                      fill={`hsl(${210 + (i * 30)}, 70%, 50%)`} 
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
};
