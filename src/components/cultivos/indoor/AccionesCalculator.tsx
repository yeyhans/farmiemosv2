import React, { useState, useEffect } from 'react';

interface AccionesCalculatorProps {
  cultivoId: string;
  user_id: string;
  onClose: () => void;
  selectedDate?: Date;
}

interface Action {
  name: string;
  icon: string;
  id: string;
}

interface SelectedAction {
  id: string;
  data: any;
}

export default function AccionesCalculator({ cultivoId, user_id, onClose, selectedDate }: AccionesCalculatorProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [currentPopup, setCurrentPopup] = useState<string | null>(null);
  const [actionData, setActionData] = useState<{[key: string]: any}>({});

  const actions: Action[] = [
    { name: 'Riego', icon: '💧', id: 'riego' },
    { name: 'Poda', icon: '✂️', id: 'poda' },
    { name: 'Fertilización', icon: '🌱', id: 'fertilizacion' },
    { name: 'Tratamiento', icon: '🧪', id: 'tratamiento' },
    { name: 'Otro', icon: '📝', id: 'otro' }
  ];

  const toggleAction = (actionId: string) => {
    const newSelectedAction = selectedAction === actionId ? null : actionId;
    setSelectedAction(newSelectedAction);
    
    // Broadcast action selection in real-time
    const actionSelectionEvent = new CustomEvent('accion-selection-changed', {
      detail: { 
        actionId: newSelectedAction,
        cultivoId,
        timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
      }
    });
    window.dispatchEvent(actionSelectionEvent);
  };

  const openPopup = (actionId: string) => {
    setCurrentPopup(actionId);
  };

  const closePopup = () => {
    setCurrentPopup(null);
  };

  const saveAction = (actionId: string, data: any) => {
    const newActionData = { ...actionData };
    newActionData[actionId] = data;
    setActionData(newActionData);
    closePopup();
    
    // Broadcast action data changes in real-time
    const actionDataEvent = new CustomEvent('accion-data-changed', {
      detail: { 
        actionId,
        data,
        allData: newActionData,
        cultivoId,
        timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
      }
    });
    window.dispatchEvent(actionDataEvent);
    
    console.log(`Guardando ${actionId}:`, data);
    // Here you would typically save this to your backend
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  };

  const handleFinalSave = async () => {
    try {
      if (!selectedAction) {
        alert('Por favor selecciona una acción');
        return;
      }
      
      const uniqueId = crypto.randomUUID();
      const actionToSave = {
        tipo: selectedAction,
        data: actionData[selectedAction] || {},
        timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        id: uniqueId,
        cultivoId,
        user_id
      };
      
      const response = await fetch('/api/cultivos/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultivoId: cultivoId,
          actions: [actionToSave]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la acción');
      }
      
      const data = await response.json();
      if (data.success) {
        // Emitir evento para notificar a otros componentes
        const accionUpdateEvent = new CustomEvent('cultivo-data-updated', {
          detail: {
            type: 'accion',
            cultivoId,
            action: actionToSave,
            timestamp: actionToSave.timestamp,
            success: true
          }
        });
        window.dispatchEvent(accionUpdateEvent);
        
        console.log(`Acción guardada exitosamente`);
        
        // Close the modal
        onClose();
        
        // Set a small timeout to ensure the modal is closed before reload
        setTimeout(() => {
          // Reload the page to refresh all components with new data
          window.location.reload();
        }, 100);
      }
    } catch (error: any) {
      console.error('Error al guardar la acción:', error);
      alert('Error al guardar la acción: ' + (error.message || 'Error desconocido'));
    }
  };

  // Añadir un efecto para escuchar actualizaciones globales
  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent<any>) => {
      const { type, cultivoId: updatedCultivoId } = event.detail;
      
      if (updatedCultivoId === cultivoId) {
        // Podríamos hacer algo cuando se actualizan otros datos
        console.log(`Se ha registrado una actualización de ${type}`);
      }
    };
    
    window.addEventListener('cultivo-data-updated', handleGlobalUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cultivo-data-updated', handleGlobalUpdate as EventListener);
    };
  }, [cultivoId]);

  // Add this section to generically handle form field changes and broadcast them
  const handleActionFieldChange = (actionId: string, field: string, value: any) => {
    setActionData(prev => {
      const updatedData = { 
        ...prev,
        [actionId]: { ...(prev[actionId] || {}), [field]: value }
      };
      
      // Broadcast individual field changes in real-time
      const fieldChangeEvent = new CustomEvent('accion-field-changed', {
        detail: { 
          actionId,
          field,
          value,
          allData: updatedData,
          cultivoId,
          timestamp: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
        }
      });
      window.dispatchEvent(fieldChangeEvent);
      
      return updatedData;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full relative">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-medium text-gray-800 mb-4">📈 Selecciona una Acción</h3>
        
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
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {actions.map((action) => (
            <div key={action.id} className="relative">
              <button 
                className={`w-full flex flex-col items-center p-4 border rounded-lg hover:bg-green-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  selectedAction === action.id ? 'bg-green-100 border-green-500' : ''
                }`}
                onClick={() => toggleAction(action.id)}
              >
                <span className="text-2xl mb-2">{action.icon}</span>
                <span className="text-sm font-medium">{action.name}</span>
              </button>
              
              {selectedAction === action.id && (
                <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2 p-1">
                  <button 
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAction(action.id);
                    }}
                  >
                    ❌
                  </button>
                  <button 
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPopup(action.id);
                    }}
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedAction && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleFinalSave}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Guardar Acción
            </button>
          </div>
        )}

        {/* Popup para Riego */}
        {currentPopup === 'riego' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-96 relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Configurar Riego 💧</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad (Litros)</label>
                  <input 
                    type="number" 
                    id="riego-cantidad"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.riego?.cantidad || ''}
                    onChange={(e) => handleActionFieldChange('riego', 'cantidad', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Riego</label>
                  <select 
                    id="riego-tipo"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.riego?.tipo || 'manual'}
                    onChange={(e) => handleActionFieldChange('riego', 'tipo', e.target.value)}
                  >
                    <option value="manual">Manual</option>
                    <option value="goteo">Goteo</option>
                    <option value="aspersion">Aspersión</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
                  <textarea 
                    id="riego-notas" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    value={actionData.riego?.notas || ''}
                    onChange={(e) => handleActionFieldChange('riego', 'notas', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={closePopup}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveAction('riego', {
                    cantidad: actionData.riego?.cantidad || '',
                    tipo: actionData.riego?.tipo || 'manual',
                    notas: actionData.riego?.notas || ''
                  })}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup para Poda */}
        {currentPopup === 'poda' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-96 relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Configurar Poda ✂️</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Poda</label>
                  <select 
                    id="poda-tipo"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.poda?.tipo || 'formacion'}
                    onChange={(e) => handleActionFieldChange('poda', 'tipo', e.target.value)}
                  >
                    <option value="formacion">Formación</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="sanitaria">Sanitaria</option>
                    <option value="rejuvenecimiento">Rejuvenecimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Herramientas Utilizadas</label>
                  <input 
                    type="text" 
                    id="poda-herramientas"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Tijeras, sierra..."
                    value={actionData.poda?.herramientas || ''}
                    onChange={(e) => handleActionFieldChange('poda', 'herramientas', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
                  <textarea 
                    id="poda-notas" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    value={actionData.poda?.notas || ''}
                    onChange={(e) => handleActionFieldChange('poda', 'notas', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={closePopup}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveAction('poda', {
                    tipo: actionData.poda?.tipo || 'formacion',
                    herramientas: actionData.poda?.herramientas || '',
                    notas: actionData.poda?.notas || ''
                  })}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup para Fertilización */}
        {currentPopup === 'fertilizacion' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-96 relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Configurar Fertilización 🌱</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Fertilizante</label>
                  <select 
                    id="fertilizacion-tipo"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.fertilizacion?.tipo || 'organico'}
                    onChange={(e) => handleActionFieldChange('fertilizacion', 'tipo', e.target.value)}
                  >
                    <option value="organico">Orgánico</option>
                    <option value="mineral">Mineral</option>
                    <option value="foliar">Foliar</option>
                    <option value="compuesto">Compuesto NPK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad (kg/L)</label>
                  <input 
                    type="number" 
                    id="fertilizacion-cantidad"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.fertilizacion?.cantidad || ''}
                    onChange={(e) => handleActionFieldChange('fertilizacion', 'cantidad', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
                  <textarea 
                    id="fertilizacion-notas" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    value={actionData.fertilizacion?.notas || ''}
                    onChange={(e) => handleActionFieldChange('fertilizacion', 'notas', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={closePopup}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveAction('fertilizacion', {
                    tipo: actionData.fertilizacion?.tipo || 'organico',
                    cantidad: actionData.fertilizacion?.cantidad || '',
                    notas: actionData.fertilizacion?.notas || ''
                  })}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup para Tratamiento */}
        {currentPopup === 'tratamiento' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-96 relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Configurar Tratamiento 🧪</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Tratamiento</label>
                  <select 
                    id="tratamiento-tipo"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.tratamiento?.tipo || 'fungicida'}
                    onChange={(e) => handleActionFieldChange('tratamiento', 'tipo', e.target.value)}
                  >
                    <option value="fungicida">Fungicida</option>
                    <option value="insecticida">Insecticida</option>
                    <option value="herbicida">Herbicida</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Producto Utilizado</label>
                  <input 
                    type="text" 
                    id="tratamiento-producto"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={actionData.tratamiento?.producto || ''}
                    onChange={(e) => handleActionFieldChange('tratamiento', 'producto', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dosis</label>
                  <input 
                    type="text" 
                    id="tratamiento-dosis"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: 100ml/100L"
                    value={actionData.tratamiento?.dosis || ''}
                    onChange={(e) => handleActionFieldChange('tratamiento', 'dosis', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
                  <textarea 
                    id="tratamiento-notas" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    value={actionData.tratamiento?.notas || ''}
                    onChange={(e) => handleActionFieldChange('tratamiento', 'notas', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={closePopup}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveAction('tratamiento', {
                    tipo: actionData.tratamiento?.tipo || 'fungicida',
                    producto: actionData.tratamiento?.producto || '',
                    dosis: actionData.tratamiento?.dosis || '',
                    notas: actionData.tratamiento?.notas || ''
                  })}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup para Otro */}
        {currentPopup === 'otro' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-96 relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Otra Acción 📝</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Acción</label>
                  <input 
                    type="text" 
                    id="otro-nombre"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Limpieza, Inspección..."
                    value={actionData.otro?.nombre || ''}
                    onChange={(e) => handleActionFieldChange('otro', 'nombre', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción detallada</label>
                  <textarea 
                    id="otro-descripcion" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={4}
                    value={actionData.otro?.descripcion || ''}
                    onChange={(e) => handleActionFieldChange('otro', 'descripcion', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={closePopup}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveAction('otro', {
                    nombre: actionData.otro?.nombre || '',
                    descripcion: actionData.otro?.descripcion || ''
                  })}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 