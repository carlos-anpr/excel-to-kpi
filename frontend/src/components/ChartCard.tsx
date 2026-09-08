import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ReferenceLine, ComposedChart
} from 'recharts';
import { Settings, BarChart2, Activity, PieChart as PieIcon, Layers, AlignVerticalSpaceAround, AlignHorizontalSpaceAround, TrendingUp, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// ========== PREDICCIÓN LOCAL (Simple Linear Regression + Holt-Winters simplificado) ==========
interface LocalForecastResult {
  success: boolean;
  error?: string;
  forecast_data: { x: string; y: number }[];
  confidence_interval: { lower: { x: string; y: number }[]; upper: { x: string; y: number }[] };
  metrics: {
    r_squared: number;
    trend: 'up' | 'down' | 'stable';
    trend_value: number;
    periods_predicted: number;
  };
}

function generateLocalForecast(
  data: any[],
  xKey: string,
  yKey: string,
  periods: number = 3
): LocalForecastResult {
  try {
    // Extraer valores Y numéricos
    const yValues = data.map(d => {
      const val = d[yKey];
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    }).filter(v => !isNaN(v));

    if (yValues.length < 5) {
      return { success: false, error: "Mínimo 5 puntos necesarios", forecast_data: [], confidence_interval: { lower: [], upper: [] }, metrics: { r_squared: 0, trend: 'stable', trend_value: 0, periods_predicted: 0 } };
    }

    const n = yValues.length;

    // Regresión lineal simple
    const xIndices = Array.from({ length: n }, (_, i) => i);
    const sumX = xIndices.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xIndices.reduce((acc, x, i) => acc + x * yValues[i], 0);
    const sumX2 = xIndices.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R² 
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((acc, y, i) => acc + Math.pow(y - (slope * i + intercept), 2), 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Error estándar para intervalo de confianza - más conservador
    const residuals = yValues.map((y, i) => y - (slope * i + intercept));
    const stdError = Math.sqrt(residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, n - 2));
    
    // Usar un intervalo más pequeño basado en la desviación típica de los datos
    const yStd = Math.sqrt(yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0) / n);
    // Usar el menor entre el error estándar y 20% de la media (para datos muy variables)
    const effectiveError = Math.min(stdError, yMean * 0.2);

    // Generar predicciones
    const forecastData: { x: string; y: number }[] = [];
    const lowerBound: { x: string; y: number }[] = [];
    const upperBound: { x: string; y: number }[] = [];

    // Detectar patrón de fechas
    const lastXValue = data[n - 1][xKey];
    let isDate = false;
    let lastDate: Date | null = null;
    let avgInterval = 30 * 24 * 60 * 60 * 1000; // Default 30 días

    try {
      lastDate = new Date(lastXValue);
      if (!isNaN(lastDate.getTime()) && n >= 2) {
        isDate = true;
        const firstDate = new Date(data[0][xKey]);
        avgInterval = (lastDate.getTime() - firstDate.getTime()) / (n - 1);
      }
    } catch { }

    for (let i = 0; i < periods; i++) {
      const futureIndex = n + i;
      const predictedY = slope * futureIndex + intercept;
      
      // Intervalo de confianza más conservador (aumenta poco con el tiempo)
      const uncertaintyFactor = 1 + 0.08 * i;
      const confidence = 1.5 * effectiveError * uncertaintyFactor;

      let xLabel: string;
      if (isDate && lastDate) {
        const futureDate = new Date(lastDate.getTime() + avgInterval * (i + 1));
        xLabel = futureDate.toISOString().split('T')[0];
      } else {
        xLabel = `P+${i + 1}`;
      }

      forecastData.push({ x: xLabel, y: Math.max(0, predictedY) });
      lowerBound.push({ x: xLabel, y: Math.max(0, predictedY - confidence) });
      upperBound.push({ x: xLabel, y: predictedY + confidence });
    }

    // Calcular tendencia
    const lastHistorical = yValues[n - 1];
    const lastForecast = forecastData[forecastData.length - 1]?.y || lastHistorical;
    const trendValue = lastHistorical !== 0 ? ((lastForecast - lastHistorical) / lastHistorical) * 100 : 0;

    return {
      success: true,
      forecast_data: forecastData,
      confidence_interval: { lower: lowerBound, upper: upperBound },
      metrics: {
        r_squared: Math.round(rSquared * 1000) / 1000,
        trend: trendValue > 2 ? 'up' : trendValue < -2 ? 'down' : 'stable',
        trend_value: Math.round(trendValue * 10) / 10,
        periods_predicted: periods
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message, forecast_data: [], confidence_interval: { lower: [], upper: [] }, metrics: { r_squared: 0, trend: 'stable', trend_value: 0, periods_predicted: 0 } };
  }
}

interface ChartData {
  id?: number;
  type: string;
  title: string;
  xAxis: string;
  yAxis?: string[];  // Para predicción necesitamos las columnas Y originales
  data: any[];
  lines?: string[];
  bars?: string[];
  orientation?: 'vertical' | 'horizontal';
  colSpan?: 1 | 2;
}

interface ChartCardProps {
  chart: ChartData;
  fileId?: string;
  index?: number;
}

const COLORS = {
  blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
  green: ['#10b981', '#34d399', '#6ee7b7'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  orange: ['#f59e0b', '#fbbf24', '#fcd34d'],
  red: ['#ef4444', '#f87171', '#fca5a5'],
  mixed: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']
};

export const ChartCard: React.FC<ChartCardProps> = ({ chart, fileId, index }) => {
  const chartId = chart.id ?? index;
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const getInitialState = (key: string, defaultVal: any) => {
    if (!fileId || chartId === undefined) return defaultVal;
    const storageKey = `chart_settings_${fileId}_${chartId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return parsed[key] || defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }
    return defaultVal;
  }

  const [type, setType] = useState<'line' | 'bar' | 'area' | 'pie'>(() => getInitialState('type', chart.type as any || 'bar'));
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>(() => getInitialState('orientation', chart.orientation || 'vertical'));
  
  // Auto-detect if we should use mixed colors (if there are many series)
  const dataKeys = chart.lines || chart.bars || [];
  const defaultTheme = dataKeys.length > 1 ? 'mixed' : 'blue';
  
  const [colorTheme, setColorTheme] = useState<keyof typeof COLORS>(() => getInitialState('colorTheme', defaultTheme));
  const [showSettings, setShowSettings] = useState(false);
  
  // Forecast state
  const [showForecast, setShowForecast] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState<LocalForecastResult | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    if (fileId && chartId !== undefined) {
        const storageKey = `chart_settings_${fileId}_${chartId}`;
        localStorage.setItem(storageKey, JSON.stringify({ type, colorTheme, orientation }));
    }
  }, [type, colorTheme, orientation, fileId, chartId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current && 
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Detect if chart can have forecast (needs temporal X axis and numeric Y)
  const canHaveForecast = React.useMemo(() => {
    if (!fileId || !chart.xAxis) return false;
    
    // Check if X axis looks temporal
    const xAxisLower = chart.xAxis.toLowerCase();
    const temporalKeywords = ['date', 'fecha', 'time', 'mes', 'month', 'year', 'año', 'day', 'dia', 'week', 'semana', 'quarter', 'trimestre', 'period'];
    const isTemporalByName = temporalKeywords.some(kw => xAxisLower.includes(kw));
    
    // Check if data has enough points
    const hasEnoughData = chart.data && chart.data.length >= 5;
    
    // Check if first data point X value looks like a date
    let isTemporalByValue = false;
    if (chart.data && chart.data.length > 0) {
      const firstX = chart.data[0][chart.xAxis];
      if (firstX) {
        const dateTest = new Date(firstX);
        isTemporalByValue = !isNaN(dateTest.getTime());
      }
    }
    
    return hasEnoughData && (isTemporalByName || isTemporalByValue);
  }, [fileId, chart.xAxis, chart.data]);

  // Handle forecast toggle - AHORA USA PREDICCIÓN LOCAL
  const handleForecastToggle = () => {
    if (!showForecast && !forecastData) {
      // Generar forecast localmente usando los datos del gráfico
      setForecastLoading(true);
      setForecastError(null);
      
      try {
        const yColumn = chart.yAxis?.[0] || dataKeys[0];
        if (!yColumn) {
          throw new Error("No se encontró columna Y para predecir");
        }
        
        // Calcular períodos a predecir (20-30% de los datos, máximo 6)
        const periods = Math.min(6, Math.max(3, Math.ceil(chart.data.length * 0.25)));
        
        // Usar predicción local con los datos ya agrupados del gráfico
        const result = generateLocalForecast(chart.data, chart.xAxis, yColumn, periods);
        
        if (result.success) {
          setForecastData(result);
          setShowForecast(true);
        } else {
          setForecastError(result.error || "No se pudo generar la predicción");
        }
      } catch (err: any) {
        setForecastError(err.message || "Error al generar predicción");
      } finally {
        setForecastLoading(false);
      }
    } else {
      setShowForecast(!showForecast);
    }
  };

  const currentColors = COLORS[colorTheme];
  const isPieDisabled = chart.data.length > 10;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(num);
  };

  const formatXAxis = (tickItem: any) => {
    if (typeof tickItem === 'string' && (tickItem.includes('T') || tickItem.includes('-'))) {
      const date = new Date(tickItem);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(date);
      }
    }
    return tickItem;
  };

  // Prepare data with forecast if enabled
  const getChartDataWithForecast = () => {
    if (!showForecast || !forecastData || !forecastData.success) {
      return { data: chart.data, hasForecast: false, lastHistoricalIndex: -1 };
    }

    const yColumn = chart.yAxis?.[0] || dataKeys[0];
    
    // IMPORTANTE: Mantener los datos originales del gráfico (ya agrupados)
    // y solo añadir los puntos de predicción al final
    const originalChartData = chart.data.map(d => ({
      ...d,
      [`${yColumn}_forecast`]: null,
      forecastLower: null,
      forecastUpper: null,
      isForecast: false
    }));

    // Añadir punto de transición: el último punto histórico también tiene valor de forecast
    const lastIndex = originalChartData.length - 1;
    if (lastIndex >= 0) {
      originalChartData[lastIndex][`${yColumn}_forecast`] = originalChartData[lastIndex][yColumn];
    }

    // Añadir solo los puntos de predicción (datos futuros)
    const forecastPoints = forecastData.forecast_data.map((d, i) => ({
      [chart.xAxis]: d.x,
      [yColumn]: null,
      [`${yColumn}_forecast`]: d.y,
      forecastLower: forecastData.confidence_interval.lower[i]?.y,
      forecastUpper: forecastData.confidence_interval.upper[i]?.y,
      isForecast: true
    }));

    const combinedData = [...originalChartData, ...forecastPoints];

    return { 
      data: combinedData, 
      hasForecast: true, 
      lastHistoricalIndex: lastIndex,
      yForecastKey: `${yColumn}_forecast`
    };
  };

  const renderChart = () => {
    const { data: chartData, hasForecast, yForecastKey } = getChartDataWithForecast();
    
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };
    
    const isHorizontal = orientation === 'horizontal';

    switch (type) {
      case 'line':
        return (
          <ComposedChart {...commonProps}>
            <defs>
              <linearGradient id={`forecastGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" tickFormatter={formatXAxis} />
            <YAxis fontSize={12} tickFormatter={(val) => typeof val === 'number' ? (val >= 1000 ? `${val / 1000}k` : val.toString()) : val} stroke="#9ca3af" />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                // Ocultar intervalo de confianza del tooltip
                if (name === 'forecastUpper' || name === 'forecastLower' || name.includes('Intervalo')) {
                  return null;
                }
                // Para la predicción, mostrar también el rango
                if (name.includes('Predicción') || name.includes('forecast')) {
                  const entry = props.payload;
                  if (entry?.forecastLower != null && entry?.forecastUpper != null) {
                    return [
                      `${formatNumber(value)} (rango: ${formatNumber(entry.forecastLower)} - ${formatNumber(entry.forecastUpper)})`,
                      '🔮 Predicción'
                    ];
                  }
                  return [formatNumber(value), '🔮 Predicción'];
                }
                return [formatNumber(value), name];
              }}
              labelFormatter={formatXAxis}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {/* Confidence interval area (if forecast) - solo visual, sin tooltip */}
            {hasForecast && (
              <Area
                type="monotone"
                dataKey="forecastUpper"
                stroke="none"
                fill={`url(#forecastGradient-${chartId})`}
                fillOpacity={1}
                legendType="none"
                tooltipType="none"
              />
            )}
            {/* Historical data lines */}
            {dataKeys.map((key, i) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={currentColors[i % currentColors.length]} 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
            {/* Forecast line (if enabled) */}
            {hasForecast && yForecastKey && (
              <Line
                type="monotone"
                dataKey={yForecastKey}
                stroke="#8b5cf6"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ r: 4, strokeWidth: 2, fill: '#8b5cf6' }}
                name="🔮 Predicción"
                connectNulls={true}
              />
            )}
          </ComposedChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps} layout={isHorizontal ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" vertical={!isHorizontal} horizontal={isHorizontal} stroke="#e5e7eb" />
            {isHorizontal ? (
              <>
                <XAxis type="number" fontSize={12} tickFormatter={(val) => `${val / 1000}k`} stroke="#9ca3af" />
                <YAxis dataKey={chart.xAxis} type="category" fontSize={11} tickMargin={5} stroke="#9ca3af" width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" tickFormatter={formatXAxis} />
                <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} stroke="#9ca3af" />
              </>
            )}
            <Tooltip 
              formatter={(value: number) => formatNumber(value)}
              labelFormatter={formatXAxis}
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
          <ComposedChart {...commonProps}>
            <defs>
              {dataKeys.map((key, i) => (
                <linearGradient key={key} id={`color-area-${chartId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentColors[i % currentColors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={currentColors[i % currentColors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
              <linearGradient id={`forecastAreaGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey={chart.xAxis} fontSize={12} tickMargin={10} stroke="#9ca3af" tickFormatter={formatXAxis} />
            <YAxis fontSize={12} tickFormatter={(val) => typeof val === 'number' ? (val >= 1000 ? `${val / 1000}k` : val.toString()) : val} stroke="#9ca3af" />
            <Tooltip 
              formatter={(value: number, name: string) => [formatNumber(value), name.includes('forecast') ? '🔮 Predicción' : name]}
              labelFormatter={formatXAxis}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {/* Confidence interval (if forecast) */}
            {hasForecast && (
              <Area
                type="monotone"
                dataKey="forecastUpper"
                stroke="none"
                fill={`url(#forecastAreaGradient-${chartId})`}
                fillOpacity={0.5}
                name="Intervalo"
                legendType="none"
              />
            )}
            {/* Historical areas */}
            {dataKeys.map((key, i) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={currentColors[i % currentColors.length]} 
                fillOpacity={1} 
                fill={`url(#color-area-${chartId}-${i})`}
                connectNulls={false}
              />
            ))}
            {/* Forecast area (if enabled) */}
            {hasForecast && yForecastKey && (
              <Area
                type="monotone"
                dataKey={yForecastKey}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill={`url(#forecastAreaGradient-${chartId})`}
                fillOpacity={0.6}
                name="🔮 Predicción"
                connectNulls={true}
              />
            )}
          </ComposedChart>
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
              label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
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
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{chart.title}</h3>
          {/* Forecast info badge */}
          {showForecast && forecastData?.metrics && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                ${forecastData.metrics.trend === 'up' ? 'bg-green-100 text-green-700' : 
                  forecastData.metrics.trend === 'down' ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-700'}`}>
                <TrendingUp className={`w-3 h-3 ${forecastData.metrics.trend === 'down' ? 'rotate-180' : ''}`} />
                {forecastData.metrics.trend === 'up' ? '+' : ''}{forecastData.metrics.trend_value}%
              </span>
              <span className="text-xs text-gray-500">
                R²={forecastData.metrics.r_squared} • {forecastData.metrics.periods_predicted} períodos
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Forecast button */}
          {canHaveForecast && (
            <button 
              onClick={handleForecastToggle}
              disabled={forecastLoading}
              className={`p-2 rounded-full transition-all ${
                forecastLoading ? 'text-purple-400 animate-pulse' :
                showForecast ? 'text-purple-600 bg-purple-100 hover:bg-purple-200' : 
                'text-gray-400 hover:text-purple-600 hover:bg-purple-50 opacity-0 group-hover:opacity-100'
              }`}
              title={showForecast ? 'Ocultar predicción' : 'Mostrar predicción'}
            >
              {forecastLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </button>
          )}
          <button 
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Forecast error message */}
      {forecastError && (
        <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{forecastError}</span>
          <button 
            onClick={() => setForecastError(null)} 
            className="ml-auto text-amber-500 hover:text-amber-700"
          >
            ✕
          </button>
        </div>
      )}

      {showSettings && (
        <div ref={settingsMenuRef} className="absolute top-16 right-6 z-10 bg-white p-4 rounded-lg shadow-xl border border-gray-100 w-64 animate-in fade-in zoom-in-95 duration-200">
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

          {/* Orientation selector - only for bar charts */}
          {type === 'bar' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Orientación</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setOrientation('vertical')}
                  className={`flex-1 p-1.5 rounded-md flex items-center justify-center gap-1 ${orientation === 'vertical' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Barras verticales"
                >
                  <AlignVerticalSpaceAround className="w-4 h-4" />
                  <span className="text-xs">Vertical</span>
                </button>
                <button 
                  onClick={() => setOrientation('horizontal')}
                  className={`flex-1 p-1.5 rounded-md flex items-center justify-center gap-1 ${orientation === 'horizontal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Barras horizontales"
                >
                  <AlignHorizontalSpaceAround className="w-4 h-4" />
                  <span className="text-xs">Horizontal</span>
                </button>
              </div>
            </div>
          )}

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
