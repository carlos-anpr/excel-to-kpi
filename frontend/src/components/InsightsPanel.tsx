import React, { useEffect, useState } from 'react';
import { getInsights, Insight } from '../services/api';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Zap,
  Target,
  PieChart,
  Activity,
  FileText,
  Database,
  Lightbulb,
  Search,
  Calculator,
  Clock,
  Hash,
  type LucideIcon
} from 'lucide-react';

interface InsightsPanelProps {
  fileId: string;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ fileId }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await getInsights(fileId);
        setInsights(response.insights);
        setError(null);
      } catch (err) {
        setError('Error al cargar los insights');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchInsights();
    }
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-8 p-8 bg-[#f6f7f8] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-zinc-400">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-base font-medium">Analizando datos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col gap-8 p-8 bg-[#f6f7f8] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-zinc-500">
            <p className="text-base">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex-1 flex flex-col gap-8 p-8 bg-[#f6f7f8] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-zinc-500">
            <p className="text-base">No se encontraron insights significativos para estos datos.</p>
          </div>
        </div>
      </div>
    );
  }

  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const mediumPriorityInsights = insights.filter(i => i.priority === 'medium');
  const lowPriorityInsights = insights.filter(i => i.priority === 'low');

  // Calculamos estadísticas generales
  const successCount = insights.filter(i => i.type === 'success').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;
  const infoCount = insights.filter(i => i.type === 'info').length;

  return (
    <div className="flex-1 flex flex-col gap-8 p-8 bg-[#f6f7f8] min-h-screen font-display">
      {/* PageHeading */}
      <header className="flex flex-wrap justify-between items-center gap-4">
        <p className="text-[#1A202C] text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
          Análisis Inteligente
        </p>
        <div className="flex items-center gap-4">
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white border border-zinc-200 text-[#1A202C] text-sm font-medium leading-normal tracking-[0.015em] gap-2 hover:bg-zinc-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="truncate">Exportar PDF</span>
          </button>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-blue-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="truncate">Actualizar</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Insights"
          value={insights.length.toString()}
          trend={null}
          Icon={BarChart3}
          iconColor="text-primary"
        />
        <StatCard
          label="Hallazgos Positivos"
          value={successCount.toString()}
          trend={successCount > 0 ? `+${Math.round((successCount / insights.length) * 100)}%` : null}
          trendUp={true}
          Icon={CheckCircle2}
          iconColor="text-[#0bda5b]"
        />
        <StatCard
          label="Requieren Atención"
          value={warningCount.toString()}
          trend={warningCount > 0 ? `${Math.round((warningCount / insights.length) * 100)}%` : null}
          trendUp={false}
          Icon={AlertTriangle}
          iconColor="text-[#ED8936]"
        />
        <StatCard
          label="Informativos"
          value={infoCount.toString()}
          trend={null}
          Icon={Info}
          iconColor="text-[#4FD1C5]"
        />
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Hallazgos Críticos - Columna Principal */}
        <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-zinc-200 p-6 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-[#1A202C] text-lg font-medium leading-normal">Hallazgos Críticos</p>
            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">
              {highPriorityInsights.length} detectados
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {highPriorityInsights.length > 0 ? (
              highPriorityInsights.map((insight, idx) => (
                <InsightRow key={idx} insight={insight} />
              ))
            ) : (
              <p className="text-zinc-400 text-sm py-4 text-center">No hay hallazgos críticos</p>
            )}
          </div>
        </div>

        {/* Distribución por Tipo */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-6 bg-white h-fit">
          <p className="text-[#1A202C] text-lg font-medium leading-normal">Distribución por Tipo</p>
          <div className="flex-1 flex items-center justify-center relative py-4">
            <svg className="transform -rotate-90" height="160" viewBox="0 0 36 36" width="160">
              <circle
                className="stroke-current text-[#84CC16]"
                cx="18"
                cy="18"
                fill="none"
                r="16"
                strokeDasharray={`${(successCount / insights.length) * 100}, 100`}
                strokeWidth="4"
              />
              <circle
                className="stroke-current text-[#ED8936]"
                cx="18"
                cy="18"
                fill="none"
                r="16"
                strokeDasharray={`${(warningCount / insights.length) * 100}, 100`}
                strokeDashoffset={`-${(successCount / insights.length) * 100}`}
                strokeWidth="4"
              />
              <circle
                className="stroke-current text-[#4FD1C5]"
                cx="18"
                cy="18"
                fill="none"
                r="16"
                strokeDasharray={`${(infoCount / insights.length) * 100}, 100`}
                strokeDashoffset={`-${((successCount + warningCount) / insights.length) * 100}`}
                strokeWidth="4"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#1A202C]">{insights.length}</span>
              <span className="text-sm text-zinc-500">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#84CC16]"></div>
              <span className="text-sm text-zinc-600">Positivos ({successCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#ED8936]"></div>
              <span className="text-sm text-zinc-600">Atención ({warningCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#4FD1C5]"></div>
              <span className="text-sm text-zinc-600">Informativos ({infoCount})</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabla de Insights */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-[#1A202C]">Todos los Insights Detectados</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Prioridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {[...highPriorityInsights, ...mediumPriorityInsights, ...lowPriorityInsights].map((insight, idx) => {
                const IconComponent = getInsightIcon(insight.type, insight.title);
                const iconColor = insight.type === 'warning' ? 'text-[#ED8936]' : insight.type === 'success' ? 'text-[#0bda5b]' : 'text-[#4FD1C5]';
                return (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <IconComponent className={`w-5 h-5 ${iconColor}`} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A202C] font-medium">
                    {insight.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 max-w-md truncate">
                    {insight.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <PriorityBadge priority={insight.priority} type={insight.type} />
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección de Tendencias y Patrones */}
      {mediumPriorityInsights.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-[#1A202C]">Tendencias y Patrones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediumPriorityInsights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Información Adicional */}
      {lowPriorityInsights.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-[#1A202C]">Información Adicional</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lowPriorityInsights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  trend: string | null;
  trendUp?: boolean;
  Icon: LucideIcon;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendUp, Icon, iconColor }) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-zinc-200">
      <div className="flex items-center justify-between">
        <p className="text-zinc-600 text-base font-medium leading-normal">{label}</p>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <p className="text-[#1A202C] tracking-tight text-3xl font-bold leading-tight">{value}</p>
      {trend && (
        <p className={`text-base font-medium leading-normal flex items-center gap-1 ${trendUp ? 'text-[#0bda5b]' : 'text-[#fa6238]'}`}>
          {trendUp ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
          {trend}
        </p>
      )}
    </div>
  );
};

// Helper para obtener el icono de Lucide basado en el tipo de insight
const getInsightIcon = (type: string, title: string): LucideIcon => {
  // Determinar el icono basado en el título o tipo
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('tendencia') || lowerTitle.includes('trend')) return TrendingUp;
  if (lowerTitle.includes('outlier') || lowerTitle.includes('atípico')) return Zap;
  if (lowerTitle.includes('correlación') || lowerTitle.includes('correlation')) return Activity;
  if (lowerTitle.includes('total') || lowerTitle.includes('suma')) return Calculator;
  if (lowerTitle.includes('distribución') || lowerTitle.includes('distribution')) return PieChart;
  if (lowerTitle.includes('columna') || lowerTitle.includes('column')) return Database;
  if (lowerTitle.includes('registro') || lowerTitle.includes('fila')) return FileText;
  if (lowerTitle.includes('fecha') || lowerTitle.includes('tiempo')) return Clock;
  if (lowerTitle.includes('único') || lowerTitle.includes('distinct')) return Hash;
  if (lowerTitle.includes('búsqueda') || lowerTitle.includes('search')) return Search;
  if (lowerTitle.includes('objetivo') || lowerTitle.includes('meta')) return Target;
  if (lowerTitle.includes('sugerencia') || lowerTitle.includes('recomend')) return Lightbulb;
  
  // Por tipo
  switch (type) {
    case 'warning': return AlertTriangle;
    case 'success': return CheckCircle2;
    default: return Info;
  }
};

// Insight Row Component (para lista)
const InsightRow: React.FC<{ insight: Insight }> = ({ insight }) => {
  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-[#ED8936]';
      case 'success': return 'text-[#0bda5b]';
      default: return 'text-[#4FD1C5]';
    }
  };

  const IconComponent = getInsightIcon(insight.type, insight.title);

  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border ${getBgColor(insight.type)} transition-all hover:shadow-sm`}>
      <div className={`flex-shrink-0 p-2 rounded-lg bg-white/80 ${getIconColor(insight.type)}`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[#1A202C] text-sm">{insight.title}</h4>
        <p className="text-zinc-600 text-sm mt-1 leading-relaxed">{insight.message}</p>
        {insight.data && (
          <div className="mt-2 flex flex-wrap gap-2">
            {insight.data.total !== undefined && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/80 text-zinc-700 border border-zinc-200">
                Total: {formatNumber(insight.data.total as number)}
              </span>
            )}
            {insight.data.percentage !== undefined && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/80 text-zinc-700 border border-zinc-200">
                {insight.data.percentage}%
              </span>
            )}
            {insight.data.change_percent !== undefined && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                (insight.data.change_percent as number) > 0 
                  ? 'bg-[#0bda5b]/20 text-green-700' 
                  : 'bg-[#fa6238]/20 text-orange-700'
              }`}>
                {(insight.data.change_percent as number) > 0 ? '↑' : '↓'} {Math.abs(insight.data.change_percent as number)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Insight Card Component
interface InsightCardProps {
  insight: Insight;
  compact?: boolean;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, compact }) => {
  const getBorderColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-[#ED8936]';
      case 'success': return 'border-l-[#0bda5b]';
      default: return 'border-l-[#4FD1C5]';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-[#ED8936]';
      case 'success': return 'text-[#0bda5b]';
      default: return 'text-[#4FD1C5]';
    }
  };

  const IconComponent = getInsightIcon(insight.type, insight.title);

  return (
    <div className={`flex flex-col gap-2 rounded-xl p-5 bg-white border border-zinc-200 border-l-4 ${getBorderColor(insight.type)} hover:shadow-md transition-all`}>
      <div className="flex items-center gap-3">
        <IconComponent className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${getIconColor(insight.type)}`} />
        <h4 className={`font-semibold text-[#1A202C] ${compact ? 'text-sm' : 'text-base'}`}>
          {insight.title}
        </h4>
      </div>
      <p className={`text-zinc-600 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
        {insight.message}
      </p>
      {insight.data && !compact && (
        <div className="mt-1 flex flex-wrap gap-2">
          {insight.data.total !== undefined && (
            <span className="text-xs font-medium text-zinc-500">
              Total: {formatNumber(insight.data.total as number)}
            </span>
          )}
          {insight.data.percentage !== undefined && (
            <span className="text-xs font-medium text-zinc-500">
              • {insight.data.percentage}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Priority Badge Component
const PriorityBadge: React.FC<{ priority: string; type: string }> = ({ priority, type }) => {
  const getStyles = () => {
    if (priority === 'high') {
      return type === 'warning' 
        ? 'bg-[#fa6238]/20 text-[#fa6238]' 
        : 'bg-[#0bda5b]/20 text-[#0bda5b]';
    }
    if (priority === 'medium') {
      return 'bg-[#ED8936]/20 text-[#ED8936]';
    }
    return 'bg-zinc-100 text-zinc-600';
  };

  const getLabel = () => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      default: return 'Baja';
    }
  };

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStyles()}`}>
      {getLabel()}
    </span>
  );
};

// Helper para formatear números
const formatNumber = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toLocaleString('es-ES', { maximumFractionDigits: 2 });
};

export default InsightsPanel;
