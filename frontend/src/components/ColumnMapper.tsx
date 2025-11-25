import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Loader2, CheckCircle2, BarChart3, Target, Lightbulb } from 'lucide-react';
import { getRecommendations, RecommendationsResponse } from '../services/api';

interface ColumnMapperProps {
  columns: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  fileId?: string; // For AI recommendations
}

const COLUMN_TYPES = [
  { value: 'ignore', label: 'Ignorar' },
  { value: 'date', label: 'Fecha (Eje X)' },
  { value: 'category', label: 'Categoría (Agrupación)' },
  { value: 'number', label: 'Número (Métrica/KPI)' },
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ columns, onConfirm, fileId }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Fetch AI recommendations when fileId is available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!fileId) return;
      setLoadingRecs(true);
      try {
        const recs = await getRecommendations(fileId);
        setRecommendations(recs);
        
        // Auto-apply suggested column mappings from analysis
        if (recs.analysis) {
          const autoMapping: Record<string, string> = {};
          
          // Map detected date columns
          recs.analysis.date_columns?.forEach((col: string) => {
            autoMapping[col] = 'date';
          });
          
          // Map detected numeric columns
          recs.analysis.numeric_columns?.forEach((col: string) => {
            autoMapping[col] = 'number';
          });
          
          // Map detected category columns
          recs.analysis.category_columns?.forEach((col: string) => {
            autoMapping[col] = 'category';
          });
          
          // Map ID columns to ignore
          recs.analysis.id_columns?.forEach((col: string) => {
            autoMapping[col] = 'ignore';
          });
          
          setMapping(autoMapping);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecommendations();
  }, [fileId]);

  const handleTypeChange = (column: string, type: string) => {
    setMapping(prev => ({
      ...prev,
      [column]: type
    }));
  };

  const handleConfirm = () => {
    // Filtrar columnas ignoradas
    const finalMapping = Object.entries(mapping).reduce((acc, [col, type]) => {
      if (type !== 'ignore') {
        acc[col] = type;
      }
      return acc;
    }, {} as Record<string, string>);
    
    onConfirm(finalMapping);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
      <h3 className="text-lg font-semibold mb-4">Mapeo de Columnas</h3>
      <p className="text-sm text-gray-500 mb-6">
        Define qué representa cada columna para generar los gráficos correctos.
      </p>

      {/* AI Recommendations Panel */}
      {loadingRecs && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-3 text-purple-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Analizando tus datos con IA...</span>
          </div>
        </div>
      )}

      {recommendations && !loadingRecs && (
        <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                Recomendaciones de IA
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Análisis automático
                </span>
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Hemos analizado tu archivo y detectado patrones útiles para tu dashboard.
              </p>
            </div>
          </div>

          {/* Summary Message */}
          <div className="bg-white/80 rounded-lg p-4 mb-4 border border-purple-100">
            <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
              __html: recommendations.summary.message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700">$1</strong>') 
            }} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">KPIs</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{recommendations.summary.recommended_kpis}</p>
              <p className="text-xs text-gray-500">recomendados</p>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Gráficos</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{recommendations.summary.recommended_charts}</p>
              <p className="text-xs text-gray-500">recomendados</p>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Métricas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{recommendations.summary.numeric_columns_found}</p>
              <p className="text-xs text-gray-500">detectadas</p>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Categorías</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{recommendations.summary.category_columns_found}</p>
              <p className="text-xs text-gray-500">encontradas</p>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-4 flex items-start gap-2 text-xs text-purple-700">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> Hemos pre-configurado el mapeo de columnas basado en nuestro análisis. 
              Puedes ajustarlo manualmente si lo deseas. Usa los botones de IA en el constructor para añadir 
              KPIs y gráficos recomendados automáticamente.
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <div key={col} className="p-4 border rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2 truncate" title={col}>
              {col}
            </label>
            <select
              className="w-full p-2 border rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={mapping[col] || 'ignore'}
              onChange={(e) => handleTypeChange(col, e.target.value)}
            >
              {COLUMN_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Generar Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
