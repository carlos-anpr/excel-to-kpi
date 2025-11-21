import { useState, useEffect, useCallback } from 'react'
import { DashboardBuilder } from './components/DashboardBuilder'
import { FileList } from './components/FileList'
import { FileUploader } from './components/FileUploader'
import { AlertConfig } from './components/AlertConfig'
import { DashboardView } from './components/DashboardView'
import { PreviewTable } from './components/PreviewTable'
import { uploadFile, saveMapping, getFiles, getDashboard, saveAlerts, deleteFile, getFilePreview, UploadResponse, getDashboardPreview } from './services/api'
import { LayoutDashboard, ArrowLeft, Settings, Edit, Check, BarChart2, Table as TableIcon } from 'lucide-react'

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
  const [initialMapping, setInitialMapping] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data'>('dashboard');
  const [editTab, setEditTab] = useState<'preview' | 'data'>('preview');

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
    setInitialMapping(null);
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
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la configuración");
    }
  };

  const handleMappingChange = useCallback(async (config: any) => {
    if (!currentFileId) return;
    setCurrentConfig(config);
    try {
      // Debounce could be added here if needed, but for now direct call
      const previewData = await getDashboardPreview(currentFileId, config);
      setDashboardData(previewData);
    } catch (err) {
      console.error("Error updating preview", err);
    }
  }, [currentFileId]);

  const handleExistingFileSelect = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    setCurrentFileId(fileId);
    setActiveTab('dashboard');
    
    if (file?.column_mapping) {
      await loadDashboard(fileId);
    } else {
      // Si no tiene mapeo, cargar preview y volver al builder
      try {
        const previewData = await getFilePreview(fileId);
        setCurrentFile(previewData);
        setInitialMapping(null);
        setView('mapping');
      } catch (err) {
        console.error(err);
        alert("Error al recuperar el archivo para mapeo.");
      }
    }
  };

  const handleEditMapping = async () => {
    if (!currentFileId) return;
    
    try {
      // 1. Get file preview data if not already loaded
      if (!currentFile) {
        const previewData = await getFilePreview(currentFileId);
        setCurrentFile(previewData);
      }
      
      // 2. Get current mapping from files list (or fetch fresh if needed)
      const filesList = await getFiles();
      const file = filesList.find(f => f.id === currentFileId);
      
      if (file && file.column_mapping) {
        setInitialMapping(file.column_mapping);
      }
      
      setIsEditing(true);
    } catch (err) {
      console.error(err);
      alert("Error al cargar la configuración para editar.");
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

  const handleShowDataTab = async () => {
    setActiveTab('data');
    if (currentFileId && (!currentFile || currentFile.file_id !== currentFileId)) {
      try {
        const data = await getFilePreview(currentFileId);
        setCurrentFile(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Simple */}
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div 
          className="flex items-center gap-2 font-bold text-xl text-blue-600 cursor-pointer"
          onClick={() => { setView('list'); setIsEditing(false); }}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span>AI Dashboard</span>
        </div>
        {view !== 'list' && (
          <button 
            onClick={() => { setView('list'); setIsEditing(false); }}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </button>
        )}
      </nav>

      <main className={`p-8 mx-auto ${isEditing ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Diseña tu Dashboard</h2>
                    <p className="text-gray-500">Configura tus gráficos usando los datos de la derecha.</p>
                </div>
                <button 
                    onClick={() => currentConfig && handleMappingConfirm(currentConfig)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 shadow-sm"
                >
                    <Check className="w-5 h-5" />
                    Generar Dashboard
                </button>
            </div>
            
            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left Panel: Builder */}
                <div className="w-1/3 min-w-[400px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-700">Configuración</h3>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <DashboardBuilder 
                        columns={currentFile.columns} 
                        previewData={currentFile.preview}
                        onConfirm={handleMappingConfirm}
                        initialConfig={initialMapping}
                        onChange={setCurrentConfig}
                        compact={true}
                    />
                  </div>
                </div>

                {/* Right Panel: Data Preview */}
                <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-800">Vista Previa de Datos ({currentFile.filename})</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <PreviewTable data={currentFile.preview} columns={currentFile.columns} />
                  </div>
                </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && dashboardData && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            
            {isEditing ? (
              <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Left Panel: Builder */}
                <div className="w-1/3 min-w-[350px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Configuración</h3>
                    <button 
                      onClick={() => currentConfig && handleMappingConfirm(currentConfig)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Aplicar
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {currentFile && (
                      <DashboardBuilder 
                        columns={currentFile.columns} 
                        previewData={currentFile.preview}
                        onConfirm={handleMappingConfirm}
                        initialConfig={initialMapping}
                        onChange={handleMappingChange}
                        compact={true}
                      />
                    )}
                  </div>
                </div>

                {/* Right Panel: Live Preview */}
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                        <button
                            onClick={() => setEditTab('preview')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${editTab === 'preview' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BarChart2 className="w-3.5 h-3.5" />
                            Vista Previa
                        </button>
                        <button
                            onClick={() => setEditTab('data')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${editTab === 'data' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                            Datos Fuente
                        </button>
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                        {editTab === 'preview' ? 'Los cambios se aplican automáticamente' : 'Arrastra columnas para configurar'}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-hidden relative">
                    {editTab === 'preview' ? (
                        <div className="pointer-events-none opacity-90 scale-95 origin-top h-full overflow-y-auto">
                            <DashboardView data={dashboardData} fileId={currentFileId || undefined} />
                        </div>
                    ) : (
                        <div className="h-full overflow-auto bg-white rounded-lg border shadow-sm p-4">
                             {currentFile ? (
                                <PreviewTable data={currentFile.preview} columns={currentFile.columns} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Cargando datos...
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Dashboard de Resultados</h2>
                    <p className="text-gray-500 mt-1">Visualización generada automáticamente</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleEditMapping}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-blue-700 shadow-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar Dashboard
                    </button>
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

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={handleShowDataTab}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'data' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TableIcon className="w-4 h-4" />
                        Datos
                    </button>
                </div>

                {activeTab === 'dashboard' ? (
                    <>
                        {showConfig && (
                        <AlertConfig 
                            columns={dashboardData.kpis.map((k: any) => k.label.replace('Total ', ''))} 
                            onSave={handleSaveAlerts} 
                        />
                        )}

                        <DashboardView data={dashboardData} fileId={currentFileId || undefined} />
                    </>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Datos Fuente</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {currentFile ? `${currentFile.total_rows} filas totales` : 'Cargando...'}
                            </span>
                        </div>
                        {currentFile ? (
                            <PreviewTable data={currentFile.preview} columns={currentFile.columns} />
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                Cargando datos...
                            </div>
                        )}
                    </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
