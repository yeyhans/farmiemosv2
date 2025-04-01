import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Tag {
  id: string;
  nombre: string;
  color: string;
}

interface Log {
  id: string;
  fecha: string;
  mensaje: string;
  tags: Tag[];
}

interface Strain {
  id: number;
  nombre: string;
  color?: string;
  nombreBase?: string;
  bitacora?: {
    tags: Tag[];
    logs: Log[];
  };
}

interface BitacoraStrainsProps {
  strainId: string | number;  // Puede ser string o number
  strainData: Strain;
}

function BitacoraStrains({ strainId, strainData }: BitacoraStrainsProps) {
  // Estados principales
  const [globalTags, setGlobalTags] = useState<Tag[]>([]);
  const [logs, setLogs] = useState<Log[]>(strainData.bitacora?.logs || []);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para nuevo tag
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Estados para nuevo log
  const [newLog, setNewLog] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados para alertas
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  // Estados para filtrado
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: new Date().toISOString().split('T')[0]
  });

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      if (!strainId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/cultivos/config-strain?cultivoId=${strainId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los datos');
        }
        
        const { success, data } = await response.json();
        if (success && Array.isArray(data)) {
          // Recolectar todas las etiquetas únicas de todas las strains
          const allTags = new Map<string, Tag>();
          data.forEach(strain => {
            strain.bitacora?.tags?.forEach(tag => {
              allTags.set(tag.id, tag);
            });
          });
          
          setGlobalTags(Array.from(allTags.values()));

          // Establecer los logs específicos de esta strain
          const strainEncontrada = data.find((s: Strain) => 
            s.id.toString() === strainData.id.toString()
          );
          if (strainEncontrada?.bitacora) {
            setLogs(strainEncontrada.bitacora.logs || []);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarAlerta('Error al cargar los datos', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [strainId, strainData.id]);

  // Función para mostrar alertas
  const mostrarAlerta = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setAlertMessage(mensaje);
    setAlertType(tipo);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Función para generar color aleatorio
  const generarColorAleatorio = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Función para guardar cambios en la BD
  const guardarCambios = async (strainActualizada: Strain, newTag?: Tag) => {
    if (!strainId) return false;

    try {
      const response = await fetch(`/api/cultivos/config-strain?cultivoId=${strainId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener datos actuales');
      }
      
      const { data: currentStrains } = await response.json();
      if (!Array.isArray(currentStrains)) {
        throw new Error('Formato de datos inválido');
      }

      // Si hay una nueva etiqueta, agregarla a todas las strains
      if (newTag) {
        currentStrains.forEach(strain => {
          if (!strain.bitacora) {
            strain.bitacora = { tags: [], logs: [] };
          }
          if (!strain.bitacora.tags.some(t => t.id === newTag.id)) {
            strain.bitacora.tags.push(newTag);
          }
        });
      }

      // Actualizar la strain actual
      const updatedStrains = currentStrains.map((strain: Strain) => 
        strain.id.toString() === strainData.id.toString()
          ? { ...strain, bitacora: { 
              tags: newTag ? [...globalTags, newTag] : globalTags,
              logs: strainActualizada.bitacora.logs 
            }}
          : strain
      );

      const saveResponse = await fetch('/api/cultivos/config-strain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultivoId: strainId,
          strains: updatedStrains
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Error al guardar los cambios');
      }

      const { success } = await saveResponse.json();
      return success;
    } catch (error) {
      console.error('Error al guardar:', error);
      mostrarAlerta(error.message || 'Error al guardar los cambios', 'error');
      return false;
    }
  };

  // Función para agregar nuevo tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setIsLoading(true);

    const newTag: Tag = {
      id: crypto.randomUUID(),
      nombre: newTagName.trim(),
      color: generarColorAleatorio()
    };

    try {
      const strainActualizada = {
        ...strainData,
        bitacora: {
          tags: [...globalTags, newTag],
          logs: logs
        }
      };

      const success = await guardarCambios(strainActualizada, newTag);
      if (success) {
        setGlobalTags(prev => [...prev, newTag]);
        setNewTagName('');
        setShowTagModal(false);
        mostrarAlerta('Etiqueta creada correctamente');
      } else {
        throw new Error('Error al guardar la etiqueta');
      }
    } catch (error) {
      console.error('Error al crear etiqueta:', error);
      mostrarAlerta('Error al crear la etiqueta', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para agregar nuevo log
  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    setIsLoading(true);

    try {
      const newLogEntry: Log = {
        id: crypto.randomUUID(),
        fecha: new Date(selectedDate).toISOString(),
        mensaje: newLog.trim(),
        tags: globalTags.filter(tag => selectedTags.includes(tag.id))
      };

      const updatedLogs = [newLogEntry, ...logs];
      const strainActualizada = {
        ...strainData,
        bitacora: {
          tags: globalTags,
          logs: updatedLogs
        }
      };

      const success = await guardarCambios(strainActualizada);
      if (success) {
        setLogs(updatedLogs);
        setNewLog('');
        setSelectedTags([]);
        mostrarAlerta('Registro añadido correctamente');
      } else {
        throw new Error('Error al guardar el registro');
      }
    } catch (error) {
      console.error('Error al crear registro:', error);
      mostrarAlerta('Error al crear el registro', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para filtrar logs
  const getFilteredLogs = () => {
    return logs.filter(log => {
      const fechaLog = new Date(log.fecha);
      const cumpleFiltroFecha = (!dateRange.start || fechaLog >= new Date(dateRange.start)) &&
                               (!dateRange.end || fechaLog <= new Date(dateRange.end));
      
      const cumpleFiltroTags = filteredTags.length === 0 ||
                              log.tags.some(tag => filteredTags.includes(tag.id));
      
      return cumpleFiltroFecha && cumpleFiltroTags;
    });
  };

  return (
    <div className="space-y-6">
      {/* Alerta flotante */}
      {showAlert && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out ${
          alertType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{alertMessage}</span>
          </div>
        </div>
      )}

      {/* Sección de etiquetas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Etiquetas</h3>
          <button
            onClick={() => setShowTagModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Nueva Etiqueta
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {globalTags.map(tag => (
            <span
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: tag.color, color: 'white' }}
            >
              {tag.nombre}
            </span>
          ))}
          {globalTags.length === 0 && (
            <p className="text-gray-500 text-sm">No hay etiquetas creadas</p>
          )}
        </div>
      </div>

      {/* Sección de nuevo registro */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Nuevo Registro</h3>
        
        <div className="space-y-4">
          {/* Selector de fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del registro
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Selector de etiquetas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiquetas del registro
            </label>
            <div className="flex flex-wrap gap-2">
              {globalTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTags(prev => 
                    prev.includes(tag.id) 
                      ? prev.filter(id => id !== tag.id)
                      : [...prev, tag.id]
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'ring-2 ring-offset-2 ring-green-500'
                      : ''
                  }`}
                  style={{ 
                    backgroundColor: tag.color,
                    color: 'white',
                    opacity: selectedTags.includes(tag.id) ? 1 : 0.7
                  }}
                >
                  {tag.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de mensaje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota
            </label>
            <textarea
              value={newLog}
              onChange={(e) => setNewLog(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              rows={4}
              placeholder="Escribe tu nota aquí..."
            />
          </div>

          <button
            onClick={handleAddLog}
            disabled={!newLog.trim()}
            className={`w-full px-4 py-2 rounded-md text-white transition-colors ${
              newLog.trim()
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Agregar Registro
          </button>
        </div>
      </div>

      {/* Filtros para el historial */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtro por fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rango de fechas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Filtro por etiquetas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {globalTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setFilteredTags(prev => 
                    prev.includes(tag.id) 
                      ? prev.filter(id => id !== tag.id)
                      : [...prev, tag.id]
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    filteredTags.includes(tag.id)
                      ? 'ring-2 ring-offset-2 ring-green-500'
                      : ''
                  }`}
                  style={{ 
                    backgroundColor: tag.color,
                    color: 'white',
                    opacity: filteredTags.includes(tag.id) ? 1 : 0.7
                  }}
                >
                  {tag.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Historial de Registros</h3>
        
        {logs.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No hay registros aún
          </p>
        ) : (
          <div className="space-y-4">
            {getFilteredLogs().map(log => (
              <div key={log.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap gap-2">
                    {log.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {tag.nombre}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {format(new Date(log.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{log.mensaje}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para nueva etiqueta */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Nueva Etiqueta</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nombre de la etiqueta"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setNewTagName('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className={`px-4 py-2 rounded-md text-white ${
                  newTagName.trim()
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Crear Etiqueta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BitacoraStrains;