import React, { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import AmbienteBitacoraLogs from './AmbienteBitacoraLogs';

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

interface Props {
  cultivoId: string;
  user_id: string;
  ambiente_logs?: any;
}

function AmbienteBitacoraViews({ cultivoId, user_id }: Props) {
  const [bitacoraEntries, setBitacoraEntries] = useState<BitacoraEntry[]>([]);
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

  useEffect(() => {
    fetchBitacoraEntries();
  }, [cultivoId, user_id]);

  // Actualizar cuando cambie bitacoraUpdated
  useEffect(() => {
    if (bitacoraUpdated > 0) {
      fetchBitacoraEntries();
    }
  }, [bitacoraUpdated]);

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


  // Función para actualizar cuando se completa una subida
  const handleBitacoraComplete = () => {
    setBitacoraUpdated(prev => prev + 1);
    setShowBitacoraModal(false);
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
        <button 
          onClick={() => setShowBitacoraModal(true)} 
          className="bg-custom-green hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          Añadir entrada
        </button>
      </div>
      
      {bitacoraEntries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">Aún no hay registros en la bitácora. Añade fotos para documentar el progreso de tu cultivo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bitacoraEntries.map((entry) => (
            <div key={entry.timestamp} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div 
                className="h-48 overflow-hidden cursor-pointer"
                onClick={() => openViewer(entry)}
              >
                <img 
                  src={entry.url_image} 
                  alt={entry.descripcion} 
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500">{formatRelativeDate(entry.timestamp)}</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.timestamp);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm line-clamp-3 text-gray-700">{entry.descripcion}</p>
              </div>
            </div>
          ))}
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

  

      {showBitacoraModal && (
        <AmbienteBitacoraLogs
          cultivoId={cultivoId}
          user_id={user_id}
          onClose={() => setShowBitacoraModal(false)}
          onComplete={handleBitacoraComplete}
        />
      )}
    </div>
  );
}

export default AmbienteBitacoraViews;