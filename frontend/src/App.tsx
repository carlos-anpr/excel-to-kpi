import { useState, useEffect } from 'react'
import { FileUploader } from './components/FileUploader'
import { PreviewTable } from './components/PreviewTable'
import { ColumnMapper } from './components/ColumnMapper'
import { DashboardView } from './components/DashboardView'
import { FileList } from './components/FileList'
import { uploadFile, saveMapping, getFiles, getDashboard, UploadResponse } from './services/api'
import { LayoutDashboard, ArrowLeft } from 'lucide-react'

type ViewState = 'list' | 'upload' | 'mapping' | 'dashboard';

function App() {
  const [view, setView] = useState<ViewState>('list');
  const [files, setFiles] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<UploadResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de archivos al inicio
  useEffect(() => {
    if (view === 'list') {
      loadFiles();
    }
  }, [view]);

  const loadFiles = async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (err) {
      console.error("Error cargando archivos", err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const data = await uploadFile(file);
      setCurrentFile(data);
      setView('mapping');
    } catch (err) {
      setError('Error al subir el archivo.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    if (!currentFile) return;
    try {
      await saveMapping(currentFile.file_id, mapping);
      await loadDashboard(currentFile.file_id);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el mapeo");
    }
  };

  const handleExistingFileSelect = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.column_mapping) {
      await loadDashboard(fileId);
    } else {
      // Si no tiene mapeo, deberíamos cargar la preview de nuevo (no implementado en backend getPreviewById para simplificar MVP)
      // Por ahora, solo permitimos abrir dashboards listos o subir nuevos.
      alert("Este archivo está pendiente de mapeo. Por favor, súbelo de nuevo para mapearlo (Mejora pendiente).");
    }
  };

  const loadDashboard = async (fileId: string) => {
    try {
      const data = await getDashboard(fileId);
      setDashboardData(data);
      setView('dashboard');
    } catch (err) {
      console.error(err);
      alert("Error cargando el dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Simple */}
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div 
          className="flex items-center gap-2 font-bold text-xl text-blue-600 cursor-pointer"
          onClick={() => setView('list')}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span>AI Dashboard</span>
        </div>
        {view !== 'list' && (
          <button 
            onClick={() => setView('list')}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </button>
        )}
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        {view === 'list' && (
          <FileList 
            files={files} 
            onSelect={handleExistingFileSelect} 
            onNewUpload={() => setView('upload')} 
          />
        )}

        {view === 'upload' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Sube tus datos</h2>
            <FileUploader 
              onFileSelect={handleFileSelect} 
              isUploading={isUploading} 
            />
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          </div>
        )}

        {view === 'mapping' && currentFile && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Configura tu Dashboard</h2>
              <p className="text-gray-500">Archivo: {currentFile.filename}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
              <h3 className="font-semibold mb-4">Vista Previa</h3>
              <PreviewTable data={currentFile.preview} columns={currentFile.columns} />
            </div>

            <ColumnMapper 
              columns={currentFile.columns} 
              onConfirm={handleMappingConfirm} 
            />
          </div>
        )}

        {view === 'dashboard' && dashboardData && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Dashboard de Resultados</h2>
                <p className="text-gray-500 mt-1">Visualización generada automáticamente</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="text-sm text-blue-600 hover:underline"
              >
                Exportar PDF
              </button>
            </div>
            <DashboardView data={dashboardData} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
