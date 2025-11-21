import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, BarChart2, Trash2, GripVertical, Eye, EyeOff, Search, ChevronDown, PlusCircle } from 'lucide-react';

interface DashboardBuilderProps {
  columns: string[];
  previewData: any[];
  onConfirm: (config: any) => void;
  initialConfig?: any;
  onChange?: (config: any) => void;
  compact?: boolean;
}

interface ChartConfig {
  id: number;
  name: string;
  xAxis: string | null;
  yAxis: string[];
  breakdown: string | null;
}

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

  const filteredColumns = columns.filter(c => c.toLowerCase().includes(search.toLowerCase()));

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


export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({ columns, previewData, onConfirm, initialConfig, onChange, compact = false }) => {
  const [kpis, setKpis] = useState<string[]>(() => initialConfig?.kpis || []);
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    if (initialConfig?.charts) {
      return initialConfig.charts.map((c: any, index: number) => ({
        id: c.id || Date.now() + index,
        name: c.title || `Gráfico ${index + 1}`,
        xAxis: c.xAxis,
        yAxis: c.yAxis || [],
        breakdown: c.breakdown
      }));
    }
    return [{ id: 1, name: 'Gráfico Principal', xAxis: null, yAxis: [], breakdown: null }];
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Effect to trigger onChange whenever state changes
  React.useEffect(() => {
    if (onChange) {
      const config = {
        kpis,
        charts: charts.map(c => ({
          id: c.id,
          title: c.name,
          xAxis: c.xAxis,
          yAxis: c.yAxis,
          breakdown: c.breakdown
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
    const col = draggedColumn;
    if (!col) return;
    handleDirectAdd(type, col, chartId);
    setDraggedColumn(null);
  };

  // --- Direct State Manipulation (Shared) ---
  const handleDirectAdd = (type: 'kpi' | 'xAxis' | 'yAxis' | 'breakdown', col: string, chartId?: number) => {
    if (type === 'kpi') {
      if (!kpis.includes(col)) setKpis([...kpis, col]);
    } else if (chartId) {
      setCharts(charts.map(chart => {
        if (chart.id !== chartId) return chart;
        
        if (type === 'xAxis') {
          return { ...chart, xAxis: col };
        } else if (type === 'breakdown') {
          return { ...chart, breakdown: col };
        } else {
          if (!chart.yAxis.includes(col)) {
            return { ...chart, yAxis: [...chart.yAxis, col] };
          }
        }
        return chart;
      }));
    }
  };

  const removeKpi = (col: string) => {
    setKpis(kpis.filter(k => k !== col));
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
    setCharts([...charts, { id: newId, name: `Gráfico ${charts.length + 1}`, xAxis: null, yAxis: [], breakdown: null }]);
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
      kpis,
      charts: charts.map(c => ({
        id: c.id,
        title: c.name,
        xAxis: c.xAxis,
        yAxis: c.yAxis,
        breakdown: c.breakdown
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
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
              KPIs Activos
            </h3>
            <div className="flex flex-wrap gap-2">
              {kpis.map(kpi => (
                <div key={kpi} className="bg-green-50 px-2.5 py-1 rounded-md border border-green-200 text-green-700 text-xs font-medium flex items-center gap-1.5 group">
                  {kpi}
                  <button onClick={() => removeKpi(kpi)} className="text-green-400 hover:text-red-500"><X className="w-3 h-3" /></button>
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
            </div>
          </div>

          {/* Compact Charts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                Gráficos
              </h3>
              <button onClick={addChart} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Añadir Gráfico">
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {charts.map((chart) => (
              <div key={chart.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {/* Chart Header */}
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                  <input 
                    value={chart.name}
                    onChange={(e) => setCharts(charts.map(c => c.id === chart.id ? { ...c, name: e.target.value } : c))}
                    className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none w-full hover:bg-gray-100 rounded px-1 transition-colors"
                    placeholder="Nombre del gráfico"
                  />
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

                  {/* Y Axis Row */}
                  <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                    <label className="text-xs font-medium text-gray-500 mt-1.5">Métricas</label>
                    <div className="flex flex-wrap gap-1.5 w-full">
                      {chart.yAxis.map(col => (
                        <div key={col} className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700 text-xs flex items-center gap-1">
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
                <div key={kpi} className="bg-white px-3 py-1.5 rounded-full border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2 shadow-sm">
                  {kpi}
                  <button onClick={() => removeKpi(kpi)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {kpis.length === 0 && <span className="text-gray-400 italic text-sm">Suelta columnas aquí...</span>}
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                Gráficos
              </h3>
              <button 
                onClick={addChart}
                className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Añadir Gráfico
              </button>
            </div>

            {charts.map((chart) => (
              <div key={chart.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group">
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
                          {col}
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
