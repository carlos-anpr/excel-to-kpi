import React, { useState } from 'react';
import { Plus, X, BarChart2, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';

interface DashboardBuilderProps {
  columns: string[];
  previewData: any[];
  onConfirm: (config: any) => void;
}

interface ChartConfig {
  id: number;
  name: string;
  xAxis: string | null;
  yAxis: string[];
  breakdown: string | null;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({ columns, previewData, onConfirm }) => {
  const [kpis, setKpis] = useState<string[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([
    { id: 1, name: 'Gráfico Principal', xAxis: null, yAxis: [], breakdown: null }
  ]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const handleDragStart = (e: React.DragEvent, col: string) => {
    setDraggedColumn(col);
    e.dataTransfer.setData('text/plain', col);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent, type: 'kpi' | 'xAxis' | 'yAxis' | 'breakdown', chartId?: number) => {
    e.preventDefault();
    const col = draggedColumn;
    if (!col) return;

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
    setDraggedColumn(null);
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
    const newId = Math.max(...charts.map(c => c.id), 0) + 1;
    setCharts([...charts, { id: newId, name: `Gráfico ${newId}`, xAxis: null, yAxis: [], breakdown: null }]);
  };

  const removeChart = (id: number) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const handleSave = () => {
    // Validate
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

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] pb-20">
      {/* Sidebar: Available Columns */}
      <div className="w-72 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
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
                    className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
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
  );
};
