import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, BarChart2, Trash2, GripVertical, Eye, EyeOff, Search, ChevronDown, PlusCircle, Sparkles, Loader2, AlignVerticalSpaceAround, AlignHorizontalSpaceAround, RectangleHorizontal, Square, Calculator } from 'lucide-react';
import { getNextRecommendation, ChartRecommendation, KPIRecommendation } from '../services/api';

// Tipos de agregación disponibles
type AggregationType = 'auto' | 'sum' | 'avg' | 'count' | 'countd' | 'min' | 'max';

const AGGREGATION_OPTIONS: { value: AggregationType; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto', icon: '🔮' },
  { value: 'sum', label: 'Suma', icon: 'Σ' },
  { value: 'avg', label: 'Promedio', icon: 'x̄' },
  { value: 'count', label: 'Conteo', icon: '#' },
  { value: 'countd', label: 'Únicos', icon: '◇' },
  { value: 'min', label: 'Mínimo', icon: '↓' },
  { value: 'max', label: 'Máximo', icon: '↑' },
];

interface DashboardBuilderProps {
  columns: string[];
  previewData: any[];
  onConfirm: (config: any) => void;
  initialConfig?: any;
  onChange?: (config: any) => void;
  compact?: boolean;
  fileId?: string; // Needed for AI recommendations
}

// Configuración de KPI con agregación
interface KPIConfig {
  column: string;
  aggregation: AggregationType;
}

interface ChartConfig {
  id: number;
  name: string;
  xAxis: string | null;
  yAxis: string[];
  breakdown: string | null;
  order: number;
  orientation?: 'vertical' | 'horizontal';
  colSpan?: 1 | 2;
  aggregations?: Record<string, AggregationType>; // Agregación por columna Y
}

// --- Helper Component: Aggregation Selector ---
const AggregationSelector: React.FC<{
  value: AggregationType;
  onChange: (agg: AggregationType) => void;
  compact?: boolean;
}> = ({ value, onChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = AGGREGATION_OPTIONS.find(o => o.value === value) || AGGREGATION_OPTIONS[0];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors
          ${compact ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300'}
          ${isOpen ? 'ring-2 ring-blue-300' : ''}`}
        title={`Agregación: ${currentOption.label}`}
      >
        <span className="font-mono">{currentOption.icon}</span>
        {!compact && <span>{currentOption.label}</span>}
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {AGGREGATION_OPTIONS.map(option => (
            <div
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors
                ${option.value === value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono w-4">{option.icon}</span>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Helper Component: Column Selector (Smart Dropdown) ---
const ColumnSelector: React.FC<{
  columns: string[];
  onSelect: (col: string) => void;
  placeholder?: string;
  trigger?: React.ReactNode;
  className?: string;
}> = ({ columns, onSelect, placeholder = "Seleccionar columna...", trigger, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Filter columns safely - ensure each column is a valid string
  const filteredColumns = columns
    .filter(c => typeof c === 'string' && c.trim() !== '')
    .filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger || (
          <div className="flex items-center justify-between bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm hover:border-blue-400 transition-colors">
            <span className={!search && "text-gray-500"}>{placeholder}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left left-0">
          <div className="p-2 border-b bg-gray-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredColumns.length > 0 ? (
              filteredColumns.map(col => (
                <div
                  key={col}
                  onClick={() => { onSelect(col); setIsOpen(false); setSearch(""); }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                >
                  {col}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">No se encontraron columnas</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({ columns: rawColumns, previewData, onConfirm, initialConfig, onChange, compact = false, fileId }) => {
  // Sanitize columns - ensure all are valid strings
  const columns = (rawColumns || []).filter((c): c is string => typeof c === 'string' && c.trim() !== '');
  
  // KPIs ahora soportan configuración con agregación
  const [kpis, setKpis] = useState<KPIConfig[]>(() => {
    if (initialConfig?.kpis) {
      return initialConfig.kpis.map((k: string | KPIConfig) => 
        typeof k === 'string' ? { column: k, aggregation: 'auto' as AggregationType } : k
      );
    }
    return [];
  });
  
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    if (initialConfig?.charts) {
      return initialConfig.charts
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((c: any, index: number) => ({
          id: c.id || Date.now() + index,
          name: c.title || `Gráfico ${index + 1}`,
          xAxis: c.xAxis,
          yAxis: c.yAxis || [],
          breakdown: c.breakdown,
          order: c.order ?? index,
          orientation: c.orientation || 'vertical',
          colSpan: c.colSpan || 1,
          aggregations: c.aggregations || {}
        }));
    }
    return [{ id: 1, name: 'Gráfico Principal', xAxis: null, yAxis: [], breakdown: null, order: 0, orientation: 'vertical' as const, colSpan: 1 as const, aggregations: {} }];
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [draggedChartIndex, setDraggedChartIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [loadingAiKpi, setLoadingAiKpi] = useState(false);
  const [loadingAiChart, setLoadingAiChart] = useState(false);
  const prevChartsLength = useRef(charts.length);
  
  // Refs para tener siempre el valor actual (evita problemas de closure con estado async)
  const chartsRef = useRef(charts);
  const kpisRef = useRef(kpis);
  
  // Mantener refs actualizadas
  useEffect(() => {
    chartsRef.current = charts;
  }, [charts]);
  
  useEffect(() => {
    kpisRef.current = kpis;
  }, [kpis]);

  // Function to get current config for AI recommendations - usa refs para valor actual
  const getCurrentConfig = () => ({
    kpis: kpisRef.current.map(k => k.column), // Solo columnas para la IA
    charts: chartsRef.current
      .filter(c => c.xAxis && c.yAxis.length > 0) // Solo gráficos configurados
      .map((c, index) => ({
        id: c.id,
        title: c.name,
        xAxis: c.xAxis,
        yAxis: c.yAxis,
        breakdown: c.breakdown,
        order: index,
        aggregations: c.aggregations
      }))
  });

  // AI-powered KPI recommendation
  const handleAiAddKpi = async () => {
    if (!fileId || loadingAiKpi) return;
    setLoadingAiKpi(true);
    try {
      const response = await getNextRecommendation(fileId, getCurrentConfig(), 'kpi');
      if (response.success && response.recommendation) {
        const rec = response.recommendation as KPIRecommendation;
        if (!kpisRef.current.includes(rec.column)) {
          const updatedKpis = [...kpisRef.current, rec.column];
          kpisRef.current = updatedKpis;
          setKpis(updatedKpis);
        }
      } else {
        alert(response.message || 'No hay más recomendaciones de KPIs disponibles');
      }
    } catch (error) {
      console.error('Error getting AI KPI recommendation:', error);
    } finally {
      setLoadingAiKpi(false);
    }
  };

  // AI-powered Chart recommendation
  const handleAiAddChart = async () => {
    if (!fileId || loadingAiChart) return;
    setLoadingAiChart(true);
    try {
      const currentConfig = getCurrentConfig();
      console.log('Enviando config al backend:', JSON.stringify(currentConfig, null, 2));
      
      const response = await getNextRecommendation(fileId, currentConfig, 'chart');
      console.log('Respuesta del backend:', response);
      
      if (response.success && response.recommendation) {
        const rec = response.recommendation as ChartRecommendation;
        const newId = Date.now();
        const newChart: ChartConfig = {
          id: newId,
          name: rec.title,
          xAxis: rec.xAxis,
          yAxis: rec.yAxis,
          breakdown: rec.breakdown,
          order: charts.length,
          orientation: 'vertical',
          colSpan: rec.breakdown ? 2 : 1 // Gráficos con breakdown ocupan 2 columnas por defecto
        };
        
        // Actualizar estado Y ref inmediatamente
        const updatedCharts = [...chartsRef.current, newChart];
        chartsRef.current = updatedCharts;
        setCharts(updatedCharts);
      } else {
        alert(response.message || 'No hay más recomendaciones de gráficos disponibles');
      }
    } catch (error) {
      console.error('Error getting AI chart recommendation:', error);
    } finally {
      setLoadingAiChart(false);
    }
  };

  // Scroll to new chart when added
  useEffect(() => {
    if (charts.length > prevChartsLength.current) {
      setTimeout(() => {
        const lastChart = charts[charts.length - 1];
        if (lastChart) {
          const element = document.getElementById(`chart-${lastChart.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight effect
            element.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000);
          }
        }
      }, 100);
    }
    prevChartsLength.current = charts.length;
  }, [charts]);

  // Sync with external config updates (e.g. from DashboardView reordering)
  useEffect(() => {
    if (initialConfig?.charts) {
       const newChartsState = initialConfig.charts
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((c: any, index: number) => ({
          id: c.id || Date.now() + index,
          name: c.title || `Gráfico ${index + 1}`,
          xAxis: c.xAxis,
          yAxis: c.yAxis || [],
          breakdown: c.breakdown,
          order: c.order ?? index,
          orientation: c.orientation || 'vertical',
          colSpan: c.colSpan || 1,
          aggregations: c.aggregations || {}
        }));
        
        // Compare to see if order or content changed significantly enough to replace state
        // Include aggregations in comparison to avoid losing changes
        const currentStateSig = JSON.stringify(charts.map(c => ({ id: c.id, order: c.order, aggregations: c.aggregations })));
        const newStateSig = JSON.stringify(newChartsState.map((c: any) => ({ id: c.id, order: c.order, aggregations: c.aggregations })));
        
        if (currentStateSig !== newStateSig) {
            setCharts(newChartsState);
        }
    }
  }, [initialConfig]);

  // Effect to trigger onChange whenever state changes
  React.useEffect(() => {
    if (onChange) {
      const config = {
        kpis: kpis, // Ya tiene formato {column, aggregation}
        charts: charts.map((c, index) => ({
          id: c.id,
          title: c.name,
          xAxis: c.xAxis,
          yAxis: c.yAxis,
          breakdown: c.breakdown,
          order: index,
          orientation: c.orientation || 'vertical',
          colSpan: c.colSpan || 1,
          aggregations: c.aggregations || {}
        }))
      };
      onChange(config);
    }
  }, [kpis, charts, onChange]);

  // --- Drag & Drop Handlers (Legacy / Full View) ---
  const handleDragStart = (e: React.DragEvent, col: string) => {
    setDraggedColumn(col);
    e.dataTransfer.setData('text/plain', col);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent, type: 'kpi' | 'xAxis' | 'yAxis' | 'breakdown', chartId?: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent chart drop
    const col = draggedColumn;
    if (!col) return;
    handleDirectAdd(type, col, chartId);
    setDraggedColumn(null);
  };

  const handleChartDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedChartIndex(index);
    e.dataTransfer.setData('application/x-chart-index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    // Create a ghost image or style
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleChartDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '1';
    }
    setDraggedChartIndex(null);
  };

  const handleChartDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const dragIndexStr = e.dataTransfer.getData('application/x-chart-index');
    if (!dragIndexStr) return;
    
    const dragIndex = parseInt(dragIndexStr);
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newCharts = [...charts];
    const [removed] = newCharts.splice(dragIndex, 1);
    newCharts.splice(dropIndex, 0, removed);
    
    // Update orders
    const updatedCharts = newCharts.map((c, i) => ({ ...c, order: i }));
    setCharts(updatedCharts);
  };

  // --- Direct State Manipulation (Shared) ---
  const handleDirectAdd = (type: 'kpi' | 'xAxis' | 'yAxis' | 'breakdown', col: string, chartId?: number) => {
    if (type === 'kpi') {
      if (!kpis.find(k => k.column === col)) {
        setKpis([...kpis, { column: col, aggregation: 'auto' }]);
      }
    } else if (chartId) {
      setCharts(charts.map(chart => {
        if (chart.id !== chartId) return chart;
        
        if (type === 'xAxis') {
          return { ...chart, xAxis: col };
        } else if (type === 'breakdown') {
          return { ...chart, breakdown: col };
        } else {
          if (!chart.yAxis.includes(col)) {
            // Añadir columna Y con agregación auto
            const newAggregations = { ...chart.aggregations, [col]: 'auto' as AggregationType };
            return { ...chart, yAxis: [...chart.yAxis, col], aggregations: newAggregations };
          }
        }
        return chart;
      }));
    }
  };

  const removeKpi = (col: string) => {
    setKpis(kpis.filter(k => k.column !== col));
  };
  
  const updateKpiAggregation = (col: string, aggregation: AggregationType) => {
    setKpis(kpis.map(k => k.column === col ? { ...k, aggregation } : k));
  };
  
  const updateChartAggregation = (chartId: number, col: string, aggregation: AggregationType) => {
    setCharts(charts.map(chart => {
      if (chart.id !== chartId) return chart;
      return { ...chart, aggregations: { ...chart.aggregations, [col]: aggregation } };
    }));
  };

  const removeChartItem = (chartId: number, type: 'xAxis' | 'yAxis' | 'breakdown', col: string) => {
    setCharts(charts.map(chart => {
      if (chart.id !== chartId) return chart;
      if (type === 'xAxis') return { ...chart, xAxis: null };
      if (type === 'breakdown') return { ...chart, breakdown: null };
      return { ...chart, yAxis: chart.yAxis.filter(y => y !== col) };
    }));
  };

  const addChart = () => {
    const newId = Date.now();
    setCharts([...charts, { id: newId, name: `Gráfico ${charts.length + 1}`, xAxis: null, yAxis: [], breakdown: null, order: charts.length, orientation: 'vertical', colSpan: 1, aggregations: {} }]);
  };

  const removeChart = (id: number) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const handleSave = () => {
    if (charts.some(c => !c.xAxis || c.yAxis.length === 0)) {
      alert("Todos los gráficos deben tener un Eje X y al menos una serie de datos.");
      return;
    }
    const config = {
      kpis: kpis, // Ya en formato {column, aggregation}
      charts: charts.map((c, index) => ({
        id: c.id,
        title: c.name,
        xAxis: c.xAxis,
        yAxis: c.yAxis,
        breakdown: c.breakdown,
        order: index,
        orientation: c.orientation || 'vertical',
        colSpan: c.colSpan || 1,
        aggregations: c.aggregations || {}
      }))
    };
    onConfirm(config);
  };

  // --- Compact View Render ---
  if (compact) {
    return (
      <div className="flex flex-col h-full bg-gray-50/50">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Compact KPI Section */}
          <div 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-green-50', 'border-green-300');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-green-50', 'border-green-300');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-green-50', 'border-green-300');
              const col = e.dataTransfer.getData('text/plain');
              if (col) handleDirectAdd('kpi', col);
            }}
          >
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
              KPIs Activos
            </h3>
            <div className="flex flex-wrap gap-2">
              {kpis.map(kpi => (
                <div key={kpi.column} className="bg-green-50 px-2.5 py-1 rounded-md border border-green-200 text-green-700 text-xs font-medium flex items-center gap-1.5 group">
                  <AggregationSelector 
                    value={kpi.aggregation} 
                    onChange={(agg) => updateKpiAggregation(kpi.column, agg)}
                    compact
                  />
                  {kpi.column}
                  <button onClick={() => removeKpi(kpi.column)} className="text-green-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <ColumnSelector 
                columns={columns} 
                onSelect={(col) => handleDirectAdd('kpi', col)}
                trigger={
                  <button className="px-2.5 py-1 rounded-md border border-dashed border-gray-300 text-gray-500 text-xs hover:border-blue-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Añadir
                  </button>
                }
              />
              {fileId && (
                <button 
                  onClick={handleAiAddKpi}
                  disabled={loadingAiKpi}
                  className="px-2.5 py-1 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium flex items-center gap-1 hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                  title="Añadir KPI recomendado por IA"
                >
                  {loadingAiKpi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  IA
                </button>
              )}
            </div>
          </div>

          {/* Compact Charts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                Gráficos
              </h3>
              <div className="flex items-center gap-2">
                {fileId && (
                  <button 
                    onClick={handleAiAddChart}
                    disabled={loadingAiChart}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 p-1 rounded transition-all disabled:opacity-50 shadow-sm" 
                    title="Añadir Gráfico recomendado por IA"
                  >
                    {loadingAiChart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={addChart} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Añadir Gráfico vacío">
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {charts.map((chart, index) => (
              <div 
                key={chart.id} 
                id={`chart-${chart.id}`} 
                draggable
                onDragStart={(e) => handleChartDragStart(e, index)}
                onDragEnd={handleChartDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleChartDrop(e, index)}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300 ${draggedChartIndex === index ? 'opacity-50 border-blue-400 border-dashed' : ''}`}
              >
                {/* Chart Header */}
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center cursor-move">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded border border-blue-200" title="Orden">
                      #{index + 1}
                    </span>
                    <input 
                      value={chart.name}
                      onChange={(e) => setCharts(charts.map(c => c.id === chart.id ? { ...c, name: e.target.value } : c))}
                      className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none w-full hover:bg-gray-100 rounded px-1 transition-colors"
                      placeholder="Nombre del gráfico"
                    />
                  </div>
                  {charts.length > 1 && (
                    <button onClick={() => removeChart(chart.id)} className="text-gray-400 hover:text-red-500 ml-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Chart Config Grid */}
                <div className="p-3 space-y-3">
                  {/* Validation Warning */}
                  {(!chart.xAxis || chart.yAxis.length === 0) && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                      <span className="font-bold">!</span> 
                      {!chart.xAxis ? "Falta Eje X (Categoría)" : "Falta Métrica (Valor numérico)"}
                    </div>
                  )}

                  {/* X Axis Row */}
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Eje X</label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('ring-2', 'ring-blue-200', 'rounded');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('ring-2', 'ring-blue-200', 'rounded');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-blue-200', 'rounded');
                        const col = e.dataTransfer.getData('text/plain');
                        if (col) handleDirectAdd('xAxis', col, chart.id);
                      }}
                    >
                      <ColumnSelector 
                        columns={columns} 
                        onSelect={(col) => handleDirectAdd('xAxis', col, chart.id)}
                        trigger={
                          chart.xAxis ? (
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1.5 rounded text-xs font-medium cursor-pointer hover:bg-blue-100">
                              <span className="truncate">{chart.xAxis}</span>
                              <X 
                                className="w-3 h-3 ml-1 text-blue-400 hover:text-blue-600" 
                                onClick={(e) => { e.stopPropagation(); removeChartItem(chart.id, 'xAxis', chart.xAxis!); }}
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:border-blue-400 hover:text-blue-500">
                              Seleccionar Categoría...
                            </div>
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Y Axis Row */}
                  <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                    <label className="text-xs font-medium text-gray-500 mt-1.5">Métricas</label>
                    <div 
                      className="flex flex-wrap gap-1.5 w-full transition-all"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('bg-purple-50', 'rounded', 'p-1', '-m-1');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-purple-50', 'rounded', 'p-1', '-m-1');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-purple-50', 'rounded', 'p-1', '-m-1');
                        const col = e.dataTransfer.getData('text/plain');
                        if (col) handleDirectAdd('yAxis', col, chart.id);
                      }}
                    >
                      {chart.yAxis.map(col => (
                        <div key={col} className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700 text-xs flex items-center gap-1">
                          <AggregationSelector 
                            value={chart.aggregations?.[col] || 'auto'} 
                            onChange={(agg) => updateChartAggregation(chart.id, col, agg)}
                            compact
                          />
                          <span className="truncate max-w-[80px]">{col}</span>
                          <button onClick={() => removeChartItem(chart.id, 'yAxis', col)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <ColumnSelector 
                        columns={columns} 
                        onSelect={(col) => handleDirectAdd('yAxis', col, chart.id)}
                        trigger={
                          chart.yAxis.length === 0 ? (
                             <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:border-purple-400 hover:text-purple-500 flex items-center gap-1 w-full">
                                <Plus className="w-3 h-3" /> Añadir Valor...
                             </div>
                          ) : (
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-purple-400 hover:text-purple-600 transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Breakdown Row */}
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Desglose</label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('ring-2', 'ring-orange-200', 'rounded');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('ring-2', 'ring-orange-200', 'rounded');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-orange-200', 'rounded');
                        const col = e.dataTransfer.getData('text/plain');
                        if (col) handleDirectAdd('breakdown', col, chart.id);
                      }}
                    >
                      <ColumnSelector 
                        columns={columns} 
                        onSelect={(col) => handleDirectAdd('breakdown', col, chart.id)}
                        trigger={
                          chart.breakdown ? (
                            <div className="flex items-center justify-between bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1.5 rounded text-xs font-medium cursor-pointer hover:bg-orange-100">
                              <span className="truncate">{chart.breakdown}</span>
                              <X 
                                className="w-3 h-3 ml-1 text-orange-400 hover:text-orange-600" 
                                onClick={(e) => { e.stopPropagation(); removeChartItem(chart.id, 'breakdown', chart.breakdown!); }}
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:border-orange-400 hover:text-orange-500">
                              Opcional (Color)...
                            </div>
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Display Options Row */}
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 pt-2 border-t border-gray-100 mt-1">
                    <label className="text-xs font-medium text-gray-500">Opciones</label>
                    <div className="flex items-center gap-3">
                      {/* Orientation Toggle */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Barras:</span>
                        <div className="flex bg-gray-100 rounded-md p-0.5">
                          <button
                            onClick={() => setCharts(charts.map(c => c.id === chart.id ? { ...c, orientation: 'vertical' } : c))}
                            className={`p-1 rounded transition-all ${chart.orientation === 'vertical' || !chart.orientation ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Barras verticales"
                          >
                            <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCharts(charts.map(c => c.id === chart.id ? { ...c, orientation: 'horizontal' } : c))}
                            className={`p-1 rounded transition-all ${chart.orientation === 'horizontal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Barras horizontales"
                          >
                            <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Column Span Toggle */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Ancho:</span>
                        <div className="flex bg-gray-100 rounded-md p-0.5">
                          <button
                            onClick={() => setCharts(charts.map(c => c.id === chart.id ? { ...c, colSpan: 1 } : c))}
                            className={`p-1 rounded transition-all ${chart.colSpan === 1 || !chart.colSpan ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="1 columna"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCharts(charts.map(c => c.id === chart.id ? { ...c, colSpan: 2 } : c))}
                            className={`p-1 rounded transition-all ${chart.colSpan === 2 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="2 columnas (ancho completo)"
                          >
                            <RectangleHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Full View Render (Legacy Drag & Drop) ---
  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] pb-20">
      {/* Sidebar: Available Columns */}
      <div className="w-72 h-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700">Columnas</h3>
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
            title={showPreview ? "Ocultar vista previa de datos" : "Ver vista previa de datos"}
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? 'Ocultar Datos' : 'Ver Datos'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {columns.map(col => (
            <div key={col} className="space-y-1">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, col)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 active:cursor-grabbing shadow-sm"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                {col}
              </div>
              {showPreview && previewData && previewData.length > 0 && (
                <div className="text-xs text-gray-400 pl-2 truncate">
                  Ej: {previewData[0][col]}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center border-t pt-2">
          Arrastra las columnas a las zonas de la derecha
        </p>
      </div>

      {/* Main Area: Builder */}
      <div className="flex-1 overflow-y-auto pr-2 pb-24">
        <div className="space-y-6">
          
          {/* KPI Section */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'kpi')}
            className={`p-6 rounded-xl border-2 border-dashed transition-colors ${kpis.length === 0 ? 'border-gray-300 bg-gray-50' : 'border-blue-200 bg-blue-50/30'}`}
          >
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <div className="w-2 h-6 bg-green-500 rounded-full"></div>
              KPIs / Métricas Totales
            </h3>
            <p className="text-sm text-gray-500 mb-4">Arrastra aquí las columnas numéricas que quieras sumar (ej: Ventas Totales)</p>
            
            <div className="flex flex-wrap gap-2">
              {kpis.map(kpi => (
                <div key={kpi.column} className="bg-white px-3 py-1.5 rounded-full border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2 shadow-sm">
                  <AggregationSelector 
                    value={kpi.aggregation} 
                    onChange={(agg) => updateKpiAggregation(kpi.column, agg)}
                    compact
                  />
                  {kpi.column}
                  <button onClick={() => removeKpi(kpi.column)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {kpis.length === 0 && <span className="text-gray-400 italic text-sm">Suelta columnas aquí...</span>}
              {fileId && (
                <button 
                  onClick={handleAiAddKpi}
                  disabled={loadingAiKpi}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium flex items-center gap-1.5 hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                  title="Añadir KPI recomendado por IA"
                >
                  {loadingAiKpi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Sugerir con IA
                </button>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                Gráficos
              </h3>
              <div className="flex items-center gap-2">
                {fileId && (
                  <button 
                    onClick={handleAiAddChart}
                    disabled={loadingAiChart}
                    className="text-sm flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1.5 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm font-medium"
                    title="Añadir Gráfico recomendado por IA"
                  >
                    {loadingAiChart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Sugerir con IA
                  </button>
                )}
                <button 
                  onClick={addChart}
                  className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" /> Añadir Vacío
                </button>
              </div>
            </div>

            {charts.map((chart) => (
              <div key={chart.id} id={`chart-${chart.id}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group transition-all duration-300">
                <div className="flex justify-between mb-4">
                  <input 
                    value={chart.name}
                    onChange={(e) => setCharts(charts.map(c => c.id === chart.id ? { ...c, name: e.target.value } : c))}
                    className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 w-full"
                    placeholder="Nombre del gráfico"
                  />
                  {charts.length > 1 && (
                    <button onClick={() => removeChart(chart.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* X Axis Zone */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'xAxis', chart.id)}
                    className={`p-4 rounded-lg border-2 border-dashed transition-colors ${!chart.xAxis ? 'border-gray-300 bg-gray-50' : 'border-blue-200 bg-blue-50/30'}`}
                  >
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Eje X (Tiempo/Cat)</span>
                    <p className="text-xs text-gray-400 mb-3">Arrastra aquí la columna principal (ej: Fecha, País)</p>
                    {chart.xAxis ? (
                      <div className="bg-white px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium flex justify-between items-center shadow-sm">
                        {chart.xAxis}
                        <button onClick={() => removeChartItem(chart.id, 'xAxis', chart.xAxis!)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-400 text-sm">Arrastra columna aquí</div>
                    )}
                  </div>

                  {/* Breakdown Zone (New) */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'breakdown', chart.id)}
                    className={`p-4 rounded-lg border-2 border-dashed transition-colors ${!chart.breakdown ? 'border-gray-300 bg-gray-50' : 'border-orange-200 bg-orange-50/30'}`}
                  >
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Agrupación (Opcional)</span>
                    <p className="text-xs text-gray-400 mb-3">Arrastra aquí para desglosar (ej: Categoría, Segmento)</p>
                    {chart.breakdown ? (
                      <div className="bg-white px-3 py-2 rounded-lg border border-orange-200 text-orange-700 text-sm font-medium flex justify-between items-center shadow-sm">
                        {chart.breakdown}
                        <button onClick={() => removeChartItem(chart.id, 'breakdown', chart.breakdown!)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-400 text-sm">Arrastra columna aquí</div>
                    )}
                  </div>

                  {/* Y Axis Zone */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'yAxis', chart.id)}
                    className={`p-4 rounded-lg border-2 border-dashed transition-colors ${chart.yAxis.length === 0 ? 'border-gray-300 bg-gray-50' : 'border-purple-200 bg-purple-50/30'}`}
                  >
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">KPI / Métrica</span>
                    <p className="text-xs text-gray-400 mb-3">Arrastra aquí el valor numérico (ej: Ventas)</p>
                    <div className="space-y-2">
                      {chart.yAxis.map(col => (
                        <div key={col} className="bg-white px-3 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm font-medium flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-2">
                            <AggregationSelector 
                              value={chart.aggregations?.[col] || 'auto'} 
                              onChange={(agg) => updateChartAggregation(chart.id, col, agg)}
                              compact
                            />
                            {col}
                          </div>
                          <button onClick={() => removeChartItem(chart.id, 'yAxis', col)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      {chart.yAxis.length === 0 && (
                        <div className="text-center py-2 text-gray-400 text-sm">Arrastra columna aquí</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all font-bold text-base flex items-center gap-2"
          >
            <BarChart2 className="w-5 h-5" />
            Generar
          </button>
        </div>
      </div>
    </div>
  );
};
