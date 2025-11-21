import React from 'react';
import { FileText, ArrowRight, BarChart2, Trash2 } from 'lucide-react';
import { FileUploader } from './FileUploader';

interface FileRecord {
  id: string;
  filename: string;
  column_mapping: Record<string, string> | null;
}

interface FileListProps {
  files: FileRecord[];
  onSelect: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onNewUpload: () => void;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export const FileList: React.FC<FileListProps> = ({ files, onSelect, onDelete, onNewUpload, onFileSelect, isUploading }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Mis Dashboards</h2>
        {files.length > 0 && (
          <button 
            onClick={onNewUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Nuevo Dashboard
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center mb-8">
            <p className="text-gray-500">No tienes archivos subidos aún. Comienza subiendo uno.</p>
          </div>
          <FileUploader onFileSelect={onFileSelect} isUploading={isUploading} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {files.map((file) => (
            <div 
              key={file.id}
              onClick={() => onSelect(file.id)}
              className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex justify-between items-center relative"
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
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('¿Estás seguro de eliminar este archivo?')) onDelete(file.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
