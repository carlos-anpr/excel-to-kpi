import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface ColumnMapperProps {
  columns: string[];
  onConfirm: (mapping: Record<string, string>) => void;
}

const COLUMN_TYPES = [
  { value: 'ignore', label: 'Ignorar' },
  { value: 'date', label: 'Fecha (Eje X)' },
  { value: 'category', label: 'Categoría (Agrupación)' },
  { value: 'number', label: 'Número (Métrica/KPI)' },
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ columns, onConfirm }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});

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
