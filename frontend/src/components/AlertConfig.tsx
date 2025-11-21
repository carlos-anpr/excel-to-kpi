import React, { useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';

interface AlertRule {
  column: string;
  operator: string;
  threshold: number;
}

interface AlertConfigProps {
  columns: string[];
  onSave: (rules: AlertRule[]) => void;
}

export const AlertConfig: React.FC<AlertConfigProps> = ({ columns, onSave }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [newRule, setNewRule] = useState<AlertRule>({ column: columns[0] || '', operator: '>', threshold: 0 });

  const addRule = () => {
    if (newRule.column) {
      setRules([...rules, newRule]);
      setNewRule({ ...newRule, threshold: 0 }); // Reset threshold
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-800">Configuración de Alertas</h3>
      </div>
      
      <div className="flex flex-wrap gap-4 items-end mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Columna</label>
          <select 
            className="w-full p-2 border rounded-md text-sm"
            value={newRule.column}
            onChange={(e) => setNewRule({ ...newRule, column: e.target.value })}
          >
            {columns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        
        <div className="w-[100px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Operador</label>
          <select 
            className="w-full p-2 border rounded-md text-sm"
            value={newRule.operator}
            onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })}
          >
            <option value=">">Mayor que</option>
            <option value="<">Menor que</option>
          </select>
        </div>

        <div className="w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Valor Límite</label>
          <input 
            type="number" 
            className="w-full p-2 border rounded-md text-sm"
            value={newRule.threshold}
            onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
          />
        </div>

        <button 
          onClick={addRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" /> Añadir
        </button>
      </div>

      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-lg text-sm">
              <span>
                Alertar si <strong>{rule.column}</strong> es {rule.operator === '>' ? 'mayor' : 'menor'} que <strong>{rule.threshold}</strong>
              </span>
              <button onClick={() => removeRule(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => onSave(rules)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Guardar y Aplicar Alertas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
