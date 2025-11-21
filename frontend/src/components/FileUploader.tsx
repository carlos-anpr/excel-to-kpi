import React, { useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isUploading }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className="w-full max-w-xl mx-auto p-8 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer text-center"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 bg-white rounded-full shadow-sm">
          <FileSpreadsheet className="w-10 h-10 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            Sube tu archivo Excel o CSV
          </h3>
          <p className="text-gray-500 mt-2">
            Arrastra y suelta aquí, o haz clic para seleccionar
          </p>
        </div>
        
        <label className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {isUploading ? 'Subiendo...' : 'Seleccionar Archivo'}
          <input 
            type="file" 
            className="hidden" 
            accept=".csv, .xlsx, .xls" 
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
};
