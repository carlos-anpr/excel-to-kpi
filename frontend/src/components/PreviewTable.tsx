import React from 'react';

interface PreviewTableProps {
  data: any[];
  columns: string[];
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ data, columns }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full overflow-auto border rounded-lg shadow-sm mt-8 max-h-[450px]">
      <table className="w-full text-sm text-left text-gray-500 relative">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-6 py-3 font-bold bg-gray-50">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="bg-white border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td key={`${index}-${col}`} className="px-6 py-4 whitespace-nowrap">
                  {row[col]?.toString() || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 border-t">
        Mostrando primeras {data.length} filas como vista previa
      </div>
    </div>
  );
};
