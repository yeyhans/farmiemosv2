import React, { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';


interface BitacoraEntry {
  timestamp: string;
  descripcion: string;
  url_image: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
  };
}

interface Log {
  timestamp: string;
  temperatura: number;
  humedad: number;
  vpd: number;
  dewpoint: number;
}

// Tipo unificado para mostrar en el timeline
type TimelineEntry = 
  | { type: 'bitacora'; data: BitacoraEntry }
  | { type: 'ambiente'; data: Log };

interface Props {
  cultivoId: string;
  user_id: string;
  ambiente_logs?: Log[];
}

function AmbienteBitacoraViews({ cultivoId, user_id, ambiente_logs: initialLogs = [] }: Props) {
  const [bitacoraEntries, setBitacoraEntries] = useState<BitacoraEntry[]>([]);
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>(initialLogs);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<BitacoraEntry | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showBitacoraModal, setShowBitacoraModal] = useState(false);
  const [bitacoraUpdated, setBitacoraUpdated] = useState(0);

  // Cargar entradas de bitácora
  const fetchBitacoraEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cultivos/bitacora-logs?cultivoId=${cultivoId}&userId=${user_id}`);
      if (!response.ok) {
        throw new Error('Error al cargar datos de bitácora');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.bitacoraLogs)) {
        // Ordenar por fecha descendente (más reciente primero)
        const sortedEntries = data.bitacoraLogs.sort((a: BitacoraEntry, b: BitacoraEntry) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setBitacoraEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error al cargar entradas de bitácora:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar logs de ambiente
  const fetchAmbienteLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cultivos/ambiente-logs?cultivoId=${cultivoId}&userId=${user_id}`);
      if (!response.ok) {
        throw new Error('Error al cargar datos de ambiente');
      }
      
      const data = await response.json();
      console.log("Ambiente logs recibidos:", data);
      
      // El formato correcto según la API es data.data, no data.logs
      if (data.success && Array.isArray(data.data)) {
        // Ordenar por fecha descendente (más reciente primero)
        const sortedLogs = data.data.sort((a: Log, b: Log) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        console.log("Ambiente logs procesados:", sortedLogs.length);
        setLogs(sortedLogs);
        setFilteredLogs(sortedLogs);
      } else {
        console.warn("Formato de respuesta incorrecto para ambiente logs:", data);
        // Inicializar como array vacío para evitar errores
        setLogs([]);
        setFilteredLogs([]);
      }
    } catch (error) {
      console.error('Error al cargar logs de ambiente:', error);
      // Inicializar como array vacío en caso de error
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBitacoraEntries();
    fetchAmbienteLogs();
  }, [cultivoId, user_id]);

  // Actualizar cuando cambie bitacoraUpdated
  useEffect(() => {
    if (bitacoraUpdated > 0) {
      fetchBitacoraEntries();
    }
  }, [bitacoraUpdated]);

  // Escuchar actualizaciones de logs de ambiente
  useEffect(() => {
    const handleLogsUpdate = (event: CustomEvent<{ logs: Log[] }>) => {
      setLogs(event.detail.logs);
      setFilteredLogs(event.detail.logs);
    };
    
    window.addEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
    return () => window.removeEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
  }, []);

  // Combinar y ordenar entradas de bitácora y logs de ambiente
  useEffect(() => {
    // Crear timeline combinado
    const combined: TimelineEntry[] = [
      ...bitacoraEntries.map(entry => ({ type: 'bitacora' as const, data: entry })),
      ...filteredLogs.map(log => ({ type: 'ambiente' as const, data: log }))
    ];
    
    // Ordenar por fecha descendente (más reciente primero)
    const sorted = combined.sort((a, b) => 
      new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime()
    );
    
    // Limitar a mostrar solo 4 entradas
    const limited = sorted.slice(0, 4);
    

    setTimelineEntries(limited);
  }, [bitacoraEntries, filteredLogs]);

  // Para depuración - agregar log cuando se actualicen los estados
  useEffect(() => {
    console.log("Estado actual - bitacoraEntries:", bitacoraEntries.length);
    console.log("Estado actual - logs:", logs.length);
    console.log("Estado actual - filteredLogs:", filteredLogs.length);
  }, [bitacoraEntries, logs, filteredLogs]);

  // Abrir el visor de imagen
  const openViewer = (entry: BitacoraEntry) => {
    setSelectedEntry(entry);
    setEditedDescription(entry.descripcion);
    setIsViewerOpen(true);
    setIsEditing(false);
  };

  // Cerrar el visor de imagen
  const closeViewer = () => {
    setIsViewerOpen(false);
    setSelectedEntry(null);
    setIsEditing(false);
  };

  // Habilitar modo edición
  const enableEditMode = () => {
    setIsEditing(true);
  };

  // Cancelar edición
  const cancelEdit = () => {
    if (selectedEntry) {
      setEditedDescription(selectedEntry.descripcion);
    }
    setIsEditing(false);
  };

  // Guardar descripción editada
  const saveEditedDescription = async () => {
    if (!selectedEntry) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/cultivos/bitacora-logs/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          timestamp: selectedEntry.timestamp,
          newDescription: editedDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la entrada');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar estado local
        setBitacoraEntries(prevEntries => 
          prevEntries.map(entry => 
            entry.timestamp === selectedEntry.timestamp 
              ? { ...entry, descripcion: editedDescription } 
              : entry
          )
        );
        
        // Actualizar el entry seleccionado
        setSelectedEntry({
          ...selectedEntry,
          descripcion: editedDescription
        });
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error al guardar la descripción:', error);
      alert('No se pudo guardar los cambios. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar una entrada de bitácora
  const handleDelete = async (timestamp: string) => {
    if (!confirm('¿Estás seguro de eliminar esta entrada de la bitácora?')) {
      return;
    }

    try {
      const response = await fetch('/api/cultivos/bitacora-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al eliminar entrada');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar el estado eliminando la entrada
        setBitacoraEntries(prevEntries => 
          prevEntries.filter(entry => entry.timestamp !== timestamp)
        );
        
        // Si la entrada eliminada es la que se está viendo, cerrar el visor
        if (selectedEntry?.timestamp === timestamp) {
          closeViewer();
        }
      }
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
      alert('No se pudo eliminar la entrada. Intenta nuevamente.');
    }
  };

  // Formatear fecha relativa
  const formatRelativeDate = (timestamp: string) => {
    try {
      return formatDistance(
        new Date(timestamp),
        new Date(),
        { addSuffix: true, locale: es }
      );
    } catch {
      return 'fecha desconocida';
    }
  };

  // Formatear valor numérico con 1 decimal
  const formatNumber = (value: number) => {
    return value.toFixed(1);
  };

  // Encontrar el log más cercano a una fecha dada
  const findNearestLog = (timestamp: string): Log | null => {
    if (!logs.length) return null;
    
    const entryTime = new Date(timestamp).getTime();
    let nearestLog = logs[0];
    let minDiff = Math.abs(entryTime - new Date(logs[0].timestamp).getTime());
    
    logs.forEach(log => {
      const diff = Math.abs(entryTime - new Date(log.timestamp).getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestLog = log;
      }
    });
    
    // Solo devolver el log si está dentro de las 3 horas (10800000 ms)
    return minDiff <= 10800000 ? nearestLog : null;
  };

  // Función para actualizar cuando se completa una subida
  const handleBitacoraComplete = () => {
    setBitacoraUpdated(prev => prev + 1);
    setShowBitacoraModal(false);
  };

  // Formatear fecha legible
  const formatReadableDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'fecha desconocida';
    }
  };

  // Eliminar un log de ambiente
  const handleDeleteAmbienteLog = async (timestamp: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de ambiente?')) {
      return;
    }

    try {
      const response = await fetch('/api/cultivos/ambiente-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al eliminar registro de ambiente');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar el estado eliminando el log
        setLogs(prevLogs => 
          prevLogs.filter(log => log.timestamp !== timestamp)
        );
        setFilteredLogs(prevLogs => 
          prevLogs.filter(log => log.timestamp !== timestamp)
        );
      }
    } catch (error) {
      console.error('Error al eliminar registro de ambiente:', error);
      alert('No se pudo eliminar el registro. Intenta nuevamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bitácora del Cultivo</h2>
        {(bitacoraEntries.length + filteredLogs.length > 4) && (
          <span className="text-sm text-gray-500">
            Mostrando 4 de {bitacoraEntries.length + filteredLogs.length} entradas
          </span>
        )}
      </div>
      
      {timelineEntries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">Aún no hay registros en la bitácora ni logs de ambiente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {timelineEntries.map((entry, index) => {
            if (entry.type === 'bitacora') {
              const bitacoraEntry = entry.data;
              const nearestLog = findNearestLog(bitacoraEntry.timestamp);
              
              return (
                <div key={`bitacora-${bitacoraEntry.timestamp}`} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[320px]">
                  
                  <div className="bg-green-50 p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-green-700">Registro de Bitácora</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(bitacoraEntry.timestamp);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(bitacoraEntry.timestamp)}</p>
                  </div>
                  
                  <div 
                    className="h-40 overflow-hidden cursor-pointer"
                    onClick={() => openViewer(bitacoraEntry)}
                  >
                    <img 
                      src={bitacoraEntry.url_image} 
                      alt={bitacoraEntry.descripcion} 
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-sm line-clamp-3 text-gray-700 overflow-hidden">{bitacoraEntry.descripcion}</p>
                  </div>
                </div>
              );
            } else {
              // Log de ambiente
              const ambienteLog = entry.data;
              
              return (
                <div key={`ambiente-${ambienteLog.timestamp}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[320px]">
                  {/* Cabecera del log de ambiente */}
                  <div className="bg-blue-50 p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 13.5a.5.5 0 01-1 0v-5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-.5v4.5z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-blue-700">Registro de Ambiente</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAmbienteLog(ambienteLog.timestamp);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(ambienteLog.timestamp)}</p>
                  </div>
                  
                  {/* Cuerpo con valores de ambiente */}
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="grid grid-cols-4 xs:grid-cols-2 sm:grid-cols-2 gap-2 w-full">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-lg sm:text-3xl font-bold text-orange-500">{formatNumber(ambienteLog.temperatura)}°C</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">Temperatura</div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-lg sm:text-3xl font-bold text-blue-500">{formatNumber(ambienteLog.humedad)}%</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">Humedad</div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-lg sm:text-3xl font-bold text-purple-500">{formatNumber(ambienteLog.vpd)} kPa</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">VPD</div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-lg sm:text-3xl font-bold text-teal-500">{formatNumber(ambienteLog.dewpoint)}°C</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">Punto de rocío</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Visor de imagen completa con edición */}
      {isViewerOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <div className="relative">
              <img 
                src={selectedEntry.url_image} 
                alt={selectedEntry.descripcion} 
                className="w-full max-h-[70vh] object-contain"
              />
              <button 
                onClick={closeViewer}
                className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-2 flex justify-between">
                <p className="text-sm text-gray-500">
                  {new Date(selectedEntry.timestamp).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {(selectedEntry.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full p-3 border rounded-md focus:ring-green-500 focus:border-green-500 min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedDescription}
                      className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-gray-700">{selectedEntry.descripcion}</p>
                  <button
                    onClick={enableEditMode}
                    className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar descripción
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AmbienteBitacoraViews;