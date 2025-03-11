import React, { useState, useRef, useEffect } from 'react';

interface Props {
  cultivoId: string;
  user_id: string;
  onClose: () => void;
  onComplete?: () => void; // Para actualizar la vista después de completar
  selectedDate?: Date; // Nueva prop para la fecha seleccionada
}

function AmbienteBitacoraLogs({ cultivoId, user_id, onClose, onComplete, selectedDate }: Props) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [streamingDescription, setStreamingDescription] = useState('');
  const [streamComplete, setStreamComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingSpeed = 15; // ms entre caracteres

  // Efecto para simular el tecleo de la descripción
  useEffect(() => {
    if (streamingDescription && !streamComplete && !isGeneratingDescription) {
      let index = 0;
      const interval = setInterval(() => {
        setNote(streamingDescription.substring(0, index));
        index++;
        if (index > streamingDescription.length) {
          clearInterval(interval);
          setStreamComplete(true);
        }
      }, typingSpeed);
      
      return () => clearInterval(interval);
    }
  }, [streamingDescription, streamComplete, isGeneratingDescription]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Broadcast image selection
      const imageChangeEvent = new CustomEvent('bitacora-image-changed', {
        detail: { 
          hasImage: true,
          cultivoId,
          timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
        }
      });
      window.dispatchEvent(imageChangeEvent);
      
      await generateImageDescription(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      await generateImageDescription(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Solo generar la descripción con IA, sin guardar nada todavía
  const generateImageDescription = async (image: File) => {
    setIsGeneratingDescription(true);
    setStreamComplete(false);
    setNote('');
    
    try {
      const formData = new FormData();
      formData.append('image', image);
      // No incluir cultivoId para indicar que solo queremos la descripción
      
      const response = await fetch('/api/cultivos/bitacora-logs', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar la descripción');
      }
      
      const data = await response.json();
      if (data.success && data.description) {
        setStreamingDescription(data.description);
      } else {
        throw new Error('No se pudo generar una descripción');
      }
    } catch (error: any) {
      console.error('Error al procesar la imagen:', error);
      alert('Error al procesar la imagen: ' + (error.message || 'Error desconocido'));
      setStreamingDescription('No se pudo generar una descripción automática.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Update note change handler to broadcast changes in real-time
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);
    
    // Broadcast note changes in real-time
    const noteChangeEvent = new CustomEvent('bitacora-note-changed', {
      detail: { 
        note: newNote,
        cultivoId,
        timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
      }
    });
    window.dispatchEvent(noteChangeEvent);
  };

  // Guardar la imagen en Supabase junto con la descripción (editada o no)
  const handleUpload = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('cultivoId', cultivoId);
      formData.append('note', note); // La nota puede haber sido editada por el usuario
      
      // Añadir la fecha seleccionada si está disponible
      if (selectedDate) {
        formData.append('timestamp', selectedDate.toISOString());
      }
      
      // Enviamos todo a nuestro endpoint para guardar
      const response = await fetch('/api/cultivos/bitacora-logs', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar los datos');
      }
      
      // Emitir evento para notificar a otros componentes
      const bitacoraUpdateEvent = new CustomEvent('cultivo-data-updated', {
        detail: {
          type: 'bitacora',
          cultivoId,
          timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
          success: true
        }
      });
      window.dispatchEvent(bitacoraUpdateEvent);
      
      // Llamar al callback de completado si existe
      if (onComplete) {
        onComplete();
      }
      
      // Close the modal
      onClose();
      
      // Set a small timeout to ensure the modal is closed before reload
      setTimeout(() => {
        // Reload the page to refresh all components with new data
        window.location.reload();
      }, 300);
      
    } catch (error: any) {
      console.error('Error al subir la imagen:', error);
      alert('Error al subir la imagen: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsUploading(false);
    }
  };

  // Efecto para escuchar actualizaciones globales
  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent<any>) => {
      // Si se acaba de subir una foto o se actualizaron los datos de ambiente
      // podríamos hacer algo aquí, como mostrar un indicador, recargar datos, etc.
      const { type, cultivoId: updatedCultivoId } = event.detail;
      
      if (updatedCultivoId === cultivoId) {
        // Por ejemplo, podríamos mostrar un mensaje de notificación
        console.log(`Se ha registrado una actualización de ${type}`);
      }
    };
    
    window.addEventListener('cultivo-data-updated', handleGlobalUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cultivo-data-updated', handleGlobalUpdate as EventListener);
    };
  }, [cultivoId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Añadir Foto a la Bitácora</h2>
          
          {/* Mostrar la fecha seleccionada si está disponible */}
          {selectedDate && (
            <div className="mb-4 text-sm text-gray-600">
              Fecha seleccionada: {selectedDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
          
          <div
            className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer h-64 ${
              selectedImage ? 'border-gray-300' : 'border-custom-green hover:border-green-600'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
            
            {selectedImage ? (
              <img
                src={previewUrl || ''}
                alt="Vista previa"
                className="h-full max-h-56 object-contain"
              />
            ) : (
              <div className="text-center">
                <div className="text-custom-green text-5xl mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Haz clic o arrastra una imagen aquí para subirla
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            {isGeneratingDescription ? (
              <div className="h-32 border rounded-md p-3 bg-gray-50 flex items-center justify-center">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="ml-2 text-sm text-gray-500">Generando descripción...</span>
              </div>
            ) : (
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="Descripción de la imagen..."
                className="w-full h-32 p-3 border rounded-md focus:ring-green-500 focus:border-green-500"
              />
            )}
            {streamingDescription && !streamComplete && !isGeneratingDescription && (
              <p className="text-xs text-gray-500 mt-1">
                Puedes editar la descripción generada automáticamente.
              </p>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedImage || isUploading || isGeneratingDescription}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                !selectedImage || isUploading || isGeneratingDescription
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-custom-green hover:bg-green-600'
              }`}
            >
              {isUploading ? 'Subiendo...' : 'Subir Foto'}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .typing-indicator span {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 3px;
          background: #22c55e;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default AmbienteBitacoraLogs;