import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Settings, BarChart2, Activity, PieChart as PieIcon, Layers } from 'lucide-react';

interface ChartData {
  type: string;
  title: string;
  xAxis: string;
  data: any[];
  lines?: string[];
  bars?: string[];
}

interface ChartCardProps {
  chart: ChartData;
}

const COLORS = {
  blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
  green: ['#10b981', '#34d399', '#6ee7b7'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  orange: ['#f59e0b', '#fbbf24', '#fcd34d'],
  red: ['#ef4444', '#f87171', '#fca5a5'],
  mixed: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']
};

export const ChartCard: React.FC<ChartCardProps> = ({ chart }) => {
  const [type, setType] = useState<'line' | 'bar' | 'area' | 'pie'>(chart.type as any || 'bar');
  
  // Auto-detect if we should use mixed colors (if there are many series)
  const dataKeys = chart.lines || chart.bars || [];
  const defaultTheme = dataKeys.length > 1 ? 'mixed' : 'blue';
  
  const [colorTheme, setColorTheme] = useState<keyof typeof COLORS>(defaultTheme);
  const [showSettings, setShowSettings] = useState(false);

  const currentColors = COLORS[colorTheme];
  const isPieDisabled = chart.data.length > 10;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(num);
  };

  const renderChart = () => {
    const commonProps = {
      data: chart.data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" />
            <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} stroke="#9ca3af" />
            <Tooltip 
              formatter={(value: number) => formatNumber(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {dataKeys.map((key, i) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={currentColors[i % currentColors.length]} 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" />
            <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} stroke="#9ca3af" />
            <Tooltip 
              formatter={(value: number) => formatNumber(value)}
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {dataKeys.map((key, i) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={currentColors[i % currentColors.length]} 
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {dataKeys.map((key, i) => (
                <linearGradient key={key} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentColors[i % currentColors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={currentColors[i % currentColors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" />
            <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} stroke="#9ca3af" />
            <Tooltip 
              formatter={(value: number) => formatNumber(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {dataKeys.map((key, i) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={currentColors[i % currentColors.length]} 
                fillOpacity={1} 
                fill={`url(#color-${i})`} 
              />
            ))}
          </AreaChart>
        );
      case 'pie':
        // Pie charts are tricky with time-series data. We'll take the first metric and sum it by category (xAxis)
        // Or just show the distribution of the first metric across the xAxis categories.
        const pieKey = dataKeys[0];
        return (
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={pieKey}
              nameKey={chart.xAxis}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Legend />
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[450px] flex flex-col relative group">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-semibold text-gray-800">{chart.title}</h3>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-16 right-6 z-10 bg-white p-4 rounded-lg shadow-xl border border-gray-100 w-64 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de Gráfico</label>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setType('bar')}
                className={`flex-1 p-1.5 rounded-md flex justify-center ${type === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Barras"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setType('line')}
                className={`flex-1 p-1.5 rounded-md flex justify-center ${type === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Líneas"
              >
                <Activity className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setType('area')}
                className={`flex-1 p-1.5 rounded-md flex justify-center ${type === 'area' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Área"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button 
                onClick={() => !isPieDisabled && setType('pie')}
                disabled={isPieDisabled}
                className={`flex-1 p-1.5 rounded-md flex justify-center ${
                  type === 'pie' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : isPieDisabled 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:text-gray-700'
                }`}
                title={isPieDisabled ? "No disponible para muchos datos" : "Circular"}
              >
                <PieIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Color del Tema</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((color) => (
                <button
                  key={color}
                  onClick={() => setColorTheme(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${colorTheme === color ? 'border-gray-400 scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ 
                    background: color === 'mixed' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #ef4444 50%, #10b981 100%)' 
                      : COLORS[color][0] 
                  }}
                  title={color === 'mixed' ? 'Multicolor' : color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
