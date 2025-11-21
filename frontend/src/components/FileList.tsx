import React from 'react';
import { FileText, ArrowRight, BarChart2 } from 'lucide-react';

interface FileRecord {
  id: string;
  filename: string;
  column_mapping: Record<string, string> | null;
}

interface FileListProps {
  files: FileRecord[];
  onSelect: (fileId: string) => void;
  onNewUpload: () => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onSelect, onNewUpload }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Mis Dashboards</h2>
        <button 
          onClick={onNewUpload}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Nuevo Dashboard
        </button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No tienes archivos subidos aún.</p>
          <button 
            onClick={onNewUpload}
            className="text-blue-600 hover:underline font-medium"
          >
            Sube tu primer archivo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {files.map((file) => (
            <div 
              key={file.id}
              onClick={() => onSelect(file.id)}
              className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${file.column_mapping ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {file.column_mapping ? <BarChart2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {file.filename}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {file.column_mapping ? 'Dashboard Listo' : 'Pendiente de Mapeo'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
