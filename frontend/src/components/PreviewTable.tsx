import React from 'react';

interface PreviewTableProps {
  data: any[];
  columns: string[];
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ data, columns }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto border rounded-lg shadow-sm mt-8">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-6 py-3 font-bold">
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
        Mostrando primeras 5 filas como vista previa
      </div>
    </div>
  );
};
