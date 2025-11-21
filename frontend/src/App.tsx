import { useState, useEffect } from 'react'
import { DashboardBuilder } from './components/DashboardBuilder'
import { FileList } from './components/FileList'
import { FileUploader } from './components/FileUploader'
import { AlertConfig } from './components/AlertConfig'
import { DashboardView } from './components/DashboardView'
import { uploadFile, saveMapping, getFiles, getDashboard, saveAlerts, deleteFile, getFilePreview, UploadResponse } from './services/api'
import { LayoutDashboard, ArrowLeft, Settings } from 'lucide-react'

type ViewState = 'list' | 'upload' | 'mapping' | 'dashboard';

function App() {
  const [view, setView] = useState<ViewState>('list');
  const [files, setFiles] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<UploadResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
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
      setCurrentFileId(data.file_id);
      setView('mapping');
    } catch (err) {
      setError('Error al subir el archivo.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingConfirm = async (config: any) => {
    if (!currentFileId) return;
    try {
      // config ahora es { kpis: [], charts: [] }
      await saveMapping(currentFileId, config);
      await loadDashboard(currentFileId);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la configuración");
    }
  };

  const handleExistingFileSelect = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    setCurrentFileId(fileId);
    
    if (file?.column_mapping) {
      await loadDashboard(fileId);
    } else {
      // Si no tiene mapeo, cargar preview y volver al builder
      try {
        const previewData = await getFilePreview(fileId);
        setCurrentFile(previewData);
        setView('mapping');
      } catch (err) {
        console.error(err);
        alert("Error al recuperar el archivo para mapeo.");
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      await loadFiles(); // Recargar lista
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el archivo");
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

  const handleSaveAlerts = async (rules: any[]) => {
    if (!currentFileId) return;
    try {
      await saveAlerts(currentFileId, rules);
      setShowConfig(false);
      await loadDashboard(currentFileId); // Recargar para ver alertas activadas
      alert("Alertas guardadas y aplicadas.");
    } catch (err) {
      console.error(err);
      alert("Error guardando alertas");
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
            onDelete={handleDeleteFile}
            onNewUpload={() => setView('upload')}
            onFileSelect={handleFileSelect}
            isUploading={isUploading}
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Diseña tu Dashboard</h2>
              <p className="text-gray-500">Arrastra las columnas para crear tus gráficos y KPIs.</p>
            </div>
            
            <DashboardBuilder 
              columns={currentFile.columns} 
              previewData={currentFile.preview}
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
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  {showConfig ? 'Ocultar Configuración' : 'Configurar Alertas'}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Exportar PDF
                </button>
              </div>
            </div>

            {showConfig && (
              <AlertConfig 
                columns={dashboardData.kpis.map((k: any) => k.label.replace('Total ', ''))} 
                onSave={handleSaveAlerts} 
              />
            )}

            <DashboardView data={dashboardData} fileId={currentFileId || undefined} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
