import React, { useState, useEffect, useCallback } from 'react';
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

interface ActionLog {
  tipo: string;
  data: any;
  timestamp: string;
  cultivoId: string;
  user_id: string;
  id?: string;
}

// Tipo unificado para mostrar en el timeline
type TimelineEntry = 
  | { type: 'bitacora'; data: BitacoraEntry }
  | { type: 'ambiente'; data: Log }
  | { type: 'accion'; data: ActionLog };

interface Props {
  cultivoId: string;
  user_id: string;
  ambiente_logs?: Log[];
}

// Agrupar estados relacionados con modales y edición
interface ModalState {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
}

function CompleteLogsView({ cultivoId, user_id, ambiente_logs: initialLogs = [] }: Props) {
  // Estados para datos
  const [bitacoraEntries, setBitacoraEntries] = useState<BitacoraEntry[]>([]);
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>(initialLogs);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bitacoraUpdated, setBitacoraUpdated] = useState(0);

  // Estados para filtrado y presentación
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'bitacora' | 'ambiente' | 'accion'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Modificar el estado para el filtro de fechas
  const [dateFilter, setDateFilter] = useState<{
    startDate: string | undefined;
    endDate: string | undefined;
  }>({
    startDate: undefined,
    endDate: undefined
  });
  
  const [showCalendar, setShowCalendar] = useState(false);

  // Estados para modales y selecciones
  const [selectedEntry, setSelectedEntry] = useState<BitacoraEntry | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [bitacoraModal, setBitacoraModal] = useState<ModalState>({
    isOpen: false,
    isEditing: false,
    isSaving: false
  });
  
  const [selectedAmbienteLog, setSelectedAmbienteLog] = useState<Log | null>(null);
  const [editedAmbiente, setEditedAmbiente] = useState<{
    temperatura: string;
    humedad: string;
    vpd: string;
    dewpoint: string;
  }>({ temperatura: '', humedad: '', vpd: '', dewpoint: '' });
  const [ambienteModal, setAmbienteModal] = useState<ModalState>({
    isOpen: false,
    isEditing: false,
    isSaving: false
  });
  
  const [selectedActionLog, setSelectedActionLog] = useState<ActionLog | null>(null);
  const [editedAction, setEditedAction] = useState<any>({});
  const [actionModal, setActionModal] = useState<ModalState>({
    isOpen: false,
    isEditing: false,
    isSaving: false
  });

  // Funciones de utilidad
  const formatNumber = (value: number) => value.toFixed(1);
  
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

  // Funciones de cálculo para VPD y punto de rocío
  const calcularVPD = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const es = 0.6108 * Math.exp((a * temp) / (b + temp));
    const ea = es * (hum / 100);
    return es - ea;
  }, []);

  const calcularDewpoint = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Calcular VPD y punto de rocío basado en temperatura y humedad
  const calculateVpdAndDewpoint = (temperatura: number, humedad: number) => {
    // Cálculo del Punto de Rocío (dewpoint)
    // Fórmula de Magnus-Tetens
    const alpha = Math.log(humedad / 100) + (17.27 * temperatura) / (237.3 + temperatura);
    const dewpoint = (237.3 * alpha) / (17.27 - alpha);
    
    // Cálculo del VPD (Déficit de Presión de Vapor)
    // Fórmula simplificada
    const saturatedVaporPressure = 0.6108 * Math.exp((17.27 * temperatura) / (temperatura + 237.3));
    const actualVaporPressure = (humedad / 100) * saturatedVaporPressure;
    const vpd = saturatedVaporPressure - actualVaporPressure;
    
    return {
      vpd: vpd.toFixed(2),
      dewpoint: dewpoint.toFixed(1)
    };
  };

  // Manejador para cambios en los campos de temperatura y humedad
  const handleAmbienteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setEditedAmbiente(prev => {
      const newValues = { ...prev, [name]: value };
      
      // Intentar actualizar VPD y dewpoint solo si se modificaron temperatura o humedad
      if ((name === 'temperatura' || name === 'humedad') && 
          newValues.temperatura && newValues.humedad) {
        const temp = parseFloat(newValues.temperatura);
        const hum = parseFloat(newValues.humedad);
        
        // Verificar que los valores son números válidos
        if (!isNaN(temp) && !isNaN(hum)) {
          const { vpd, dewpoint } = calculateVpdAndDewpoint(temp, hum);
          return {
            ...newValues,
            vpd,
            dewpoint
          };
        }
      }
      
      return newValues;
    });
  };

  // Hook personalizado para fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchBitacoraEntries(),
        fetchAmbienteLogs(),
        fetchActionLogs()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar entradas de bitácora
  const fetchBitacoraEntries = async () => {
    try {
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
    }
  };

  // Cargar logs de ambiente
  const fetchAmbienteLogs = async () => {
    try {
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
    }
  };

  // Cargar logs de acciones
  const fetchActionLogs = async () => {
    try {
      const response = await fetch(`/api/cultivos/action-logs?cultivoId=${cultivoId}`);
      if (!response.ok) {
        throw new Error('Error al cargar datos de acciones');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.actionsLogs)) {
        // Ordenar por fecha descendente (más reciente primero)
        const sortedLogs = data.actionsLogs.sort((a: ActionLog, b: ActionLog) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        console.log("Action logs procesados:", sortedLogs.length);
        setActionLogs(sortedLogs);
      } else {
        console.warn("Formato de respuesta incorrecto para action logs:", data);
        setActionLogs([]);
      }
    } catch (error) {
      console.error('Error al cargar logs de acciones:', error);
      setActionLogs([]);
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, [cultivoId, user_id]);
  
  // Efecto para actualizar cuando cambie bitacoraUpdated
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

  // Modificar el efecto que combina y filtra entradas
  useEffect(() => {
    // Crear timeline combinado
    let combined: TimelineEntry[] = [];
    
    // Aplicar filtro por tipo
    if (selectedFilter === 'all' || selectedFilter === 'bitacora') {
      combined = [...combined, ...bitacoraEntries.map(entry => ({ type: 'bitacora' as const, data: entry }))];
    }
    
    if (selectedFilter === 'all' || selectedFilter === 'ambiente') {
      combined = [...combined, ...filteredLogs.map(log => ({ type: 'ambiente' as const, data: log }))];
    }
    
    if (selectedFilter === 'all' || selectedFilter === 'accion') {
      combined = [...combined, ...actionLogs.map(log => ({ type: 'accion' as const, data: log }))];
    }
    
    // Aplicar filtro por fecha si hay fechas seleccionadas
    if (dateFilter.startDate || dateFilter.endDate) {
      combined = combined.filter(entry => {
        const entryDate = new Date(entry.data.timestamp);
        
        // Si solo hay fecha de inicio, mostrar desde esa fecha
        if (dateFilter.startDate && !dateFilter.endDate) {
          return entryDate >= new Date(dateFilter.startDate);
        }
        
        // Si solo hay fecha de fin, mostrar hasta esa fecha
        if (!dateFilter.startDate && dateFilter.endDate) {
          return entryDate <= new Date(dateFilter.endDate);
        }
        
        // Si hay ambas fechas, mostrar registros en ese rango
        if (dateFilter.startDate && dateFilter.endDate) {
          return entryDate >= new Date(dateFilter.startDate) && entryDate <= new Date(dateFilter.endDate);
        }
        
        return true;
      });
    }
    
    // Ordenar según la preferencia seleccionada
    if (sortOrder === 'newest') {
      combined.sort((a, b) => 
        new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime()
      );
    } else {
      combined.sort((a, b) => 
        new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime()
      );
    }
    
    // No limitar las entradas, mostrar todas
    setTimelineEntries(combined);
  }, [bitacoraEntries, filteredLogs, actionLogs, selectedFilter, sortOrder, dateFilter]);

  // Para depuración - agregar log cuando se actualicen los estados
  useEffect(() => {
    console.log("Estado actual - bitacoraEntries:", bitacoraEntries.length);
    console.log("Estado actual - logs:", logs.length);
    console.log("Estado actual - filteredLogs:", filteredLogs.length);
    console.log("Estado actual - actionLogs:", actionLogs.length);
  }, [bitacoraEntries, logs, filteredLogs, actionLogs]);

  // Funciones modales simplificadas
  // Bitácora
  const openBitacoraViewer = (entry: BitacoraEntry) => {
    setSelectedEntry(entry);
    setEditedDescription(entry.descripcion);
    setBitacoraModal(prev => ({...prev, isOpen: true, isEditing: false}));
  };
  
  const closeBitacoraViewer = () => {
    setBitacoraModal(prev => ({...prev, isOpen: false, isEditing: false}));
    setSelectedEntry(null);
  };
  
  const toggleBitacoraEditMode = (isEditing: boolean) => {
    if (!isEditing && selectedEntry) {
      setEditedDescription(selectedEntry.descripcion);
    }
    setBitacoraModal(prev => ({...prev, isEditing}));
  };

  const cancelBitacoraEditMode = () => {
    if (selectedEntry) {
      setEditedDescription(selectedEntry.descripcion);
    }
    setBitacoraModal(prev => ({...prev, isEditing: false}));
  };

  // Handler functions with proper error handling
  const saveEditedDescription = async () => {
    if (!selectedEntry) return;
    
    setBitacoraModal(prev => ({...prev, isSaving: true}));
    try {
      const response = await fetch('/api/cultivos/bitacora-logs/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultivoId,
          timestamp: selectedEntry.timestamp,
          newDescription: editedDescription,
        }),
      });

      if (!response.ok) throw new Error('Error al actualizar la entrada');

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
        
        setSelectedEntry({
          ...selectedEntry,
          descripcion: editedDescription
        });
        
        setBitacoraModal(prev => ({...prev, isEditing: false}));
      }
    } catch (error) {
      console.error('Error al guardar la descripción:', error);
      alert('No se pudo guardar los cambios. Intenta nuevamente.');
    } finally {
      setBitacoraModal(prev => ({...prev, isSaving: false}));
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
          closeBitacoraViewer();
        }
      }
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
      alert('No se pudo eliminar la entrada. Intenta nuevamente.');
    }
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

  // Función para obtener el emoji de acción según el tipo
  const getActionIcon = (tipo: string) => {
    switch (tipo) {
      case 'riego': return '💧';
      case 'poda': return '✂️';
      case 'fertilizacion': return '🌱';
      case 'tratamiento': return '🧪';
      case 'otro': return '📝';
      default: return '🔧';
    }
  };

  // Función para obtener el nombre de acción según el tipo
  const getActionName = (tipo: string, data: any) => {
    switch (tipo) {
      case 'riego': return 'Riego';
      case 'poda': return 'Poda';
      case 'fertilizacion': return 'Fertilización';
      case 'tratamiento': return 'Tratamiento';
      case 'otro': return data?.nombre || 'Otra acción';
      default: return 'Acción';
    }
  };

  // Abrir el visor de ambiente
  const openAmbienteViewer = (log: Log) => {
    setSelectedAmbienteLog(log);
    setEditedAmbiente({
      temperatura: log.temperatura.toString(),
      humedad: log.humedad.toString(),
      vpd: log.vpd.toString(),
      dewpoint: log.dewpoint.toString()
    });
    setAmbienteModal(prev => ({...prev, isOpen: true, isEditing: false}));
  };

  // Cerrar el visor de ambiente
  const closeAmbienteViewer = () => {
    setAmbienteModal(prev => ({...prev, isOpen: false, isEditing: false}));
    setSelectedAmbienteLog(null);
  };

  // Función para editar campo específico de ambiente
  const editSpecificField = (field: 'temperatura' | 'humedad') => {
    setAmbienteModal(prev => ({...prev, isEditing: true}));
    // Foco automático en el campo seleccionado después de renderizar
    setTimeout(() => {
      const inputElement = document.getElementById(field);
      if (inputElement) inputElement.focus();
    }, 100);
  };

  // Cancelar edición de ambiente
  const cancelAmbienteEdit = () => {
    if (selectedAmbienteLog) {
      setEditedAmbiente({
        temperatura: selectedAmbienteLog.temperatura.toString(),
        humedad: selectedAmbienteLog.humedad.toString(),
        vpd: selectedAmbienteLog.vpd.toString(),
        dewpoint: selectedAmbienteLog.dewpoint.toString()
      });
    }
    setAmbienteModal(prev => ({...prev, isEditing: false}));
  };

  // Guardar valores editados de ambiente
  const saveEditedAmbiente = async () => {
    if (!selectedAmbienteLog) return;
    
    setAmbienteModal(prev => ({...prev, isSaving: true}));
    try {
      // Convertir los valores editados a números
      const temperatura = parseFloat(editedAmbiente.temperatura);
      const humedad = parseFloat(editedAmbiente.humedad);
      
      // Calcular VPD y dewpoint basado en temperatura y humedad
      const { vpd, dewpoint } = calculateVpdAndDewpoint(temperatura, humedad);
      
      const updatedAmbienteLog = {
        ...selectedAmbienteLog,
        temperatura,
        humedad,
        vpd: parseFloat(vpd),
        dewpoint: parseFloat(dewpoint)
      };

      // Obtener los logs actuales
      const updatedLogs = logs.map(log => 
        log.timestamp === selectedAmbienteLog.timestamp ? updatedAmbienteLog : log
      );
      
      const response = await fetch('/api/cultivos/ambiente-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          ambiente_logs: updatedLogs
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar los datos de ambiente');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar estado local
        setLogs(updatedLogs);
        setFilteredLogs(updatedLogs);
        
        // Actualizar el entry seleccionado
        setSelectedAmbienteLog(updatedAmbienteLog);
        setAmbienteModal(prev => ({...prev, isEditing: false}));
      }
    } catch (error) {
      console.error('Error al guardar datos de ambiente:', error);
      alert('No se pudo guardar los cambios. Intenta nuevamente.');
    } finally {
      setAmbienteModal(prev => ({...prev, isSaving: false}));
    }
  };

  // Abrir el visor de acción
  const openActionViewer = (log: ActionLog) => {
    setSelectedActionLog(log);
    setEditedAction({...log.data});
    setActionModal(prev => ({...prev, isOpen: true, isEditing: false}));
  };

  // Cerrar el visor de acción
  const closeActionViewer = () => {
    setActionModal(prev => ({...prev, isOpen: false, isEditing: false}));
    setSelectedActionLog(null);
  };

  // Habilitar modo edición para acción
  const enableActionEditMode = () => {
    setActionModal(prev => ({...prev, isEditing: true}));
  };

  // Cancelar edición de acción
  const cancelActionEdit = () => {
    if (selectedActionLog) {
      setEditedAction({...selectedActionLog.data});
    }
    setActionModal(prev => ({...prev, isEditing: false}));
  };

  // Guardar acción editada
  const saveEditedAction = async () => {
    if (!selectedActionLog) return;
    
    setActionModal(prev => ({...prev, isSaving: true}));
    try {
      // Crear la acción actualizada
      const updatedActionLog = {
        ...selectedActionLog,
        data: editedAction
      };

      // Obtener todos los logs de acción actuales
      const updatedActionLogs = actionLogs.map(log => 
        log.timestamp === selectedActionLog.timestamp ? updatedActionLog : log
      );
      
      const response = await fetch('/api/cultivos/action-logs/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          actions_logs: updatedActionLogs
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la acción');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar estado local
        setActionLogs(updatedActionLogs);
        
        // Actualizar el log seleccionado
        setSelectedActionLog(updatedActionLog);
        setActionModal(prev => ({...prev, isEditing: false}));
      }
    } catch (error) {
      console.error('Error al guardar la acción:', error);
      alert('No se pudo guardar los cambios. Intenta nuevamente.');
    } finally {
      setActionModal(prev => ({...prev, isSaving: false}));
    }
  };

  // Add this function to handle action log deletion
  const handleDeleteActionLog = async (actionIdOrTimestamp: string, timestamp: string) => {
    if (!confirm('¿Estás seguro de eliminar esta acción?')) {
      return;
    }

    try {
      const response = await fetch('/api/cultivos/action-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          actionId: actionIdOrTimestamp,
          timestamp: timestamp
        }),
      });

      if (!response.ok) {
        throw new Error('Error al eliminar acción');
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar el estado eliminando la acción
        setActionLogs(prevLogs => 
          prevLogs.filter(log => 
            log.timestamp !== timestamp && 
            (!log.id || log.id !== actionIdOrTimestamp) &&
            (!log.data?.id || log.data.id !== actionIdOrTimestamp)
          )
        );
        
        // Si la acción eliminada es la que se está viendo, cerrar el visor
        if (selectedActionLog?.timestamp === timestamp || 
            selectedActionLog?.id === actionIdOrTimestamp ||
            selectedActionLog?.data?.id === actionIdOrTimestamp) {
          closeActionViewer();
        }
      }
    } catch (error) {
      console.error('Error al eliminar acción:', error);
      alert('No se pudo eliminar la acción. Intenta nuevamente.');
    }
  };

  // Agregar esta función para eliminar logs de ambiente
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
        
        // Actualizar también los logs filtrados
        setFilteredLogs(prevLogs => 
          prevLogs.filter(log => log.timestamp !== timestamp)
        );
        
        // Si el log eliminado es el que se está viendo, cerrar el visor
        if (selectedAmbienteLog?.timestamp === timestamp) {
          closeAmbienteViewer();
        }
      }
    } catch (error) {
      console.error('Error al eliminar registro de ambiente:', error);
      alert('No se pudo eliminar el registro. Intenta nuevamente.');
    }
  };

  // Modificar el manejador de cambio de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Limpiar filtros de fecha
  const clearDateFilter = () => {
    setDateFilter({
      startDate: undefined,
      endDate: undefined
    });
    setShowCalendar(false);
  };

  // Aplicar filtros de fecha
  const applyDateFilter = () => {
    setShowCalendar(false);
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold">Historial Completo del Cultivo</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center">
            <label htmlFor="filter" className="mr-2 text-sm text-gray-600">Filtrar por:</label>
            <select 
              id="filter"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="border rounded-md py-1 px-3 bg-white text-gray-700 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todos los registros</option>
              <option value="bitacora">Solo bitácora</option>
              <option value="ambiente">Solo ambiente</option>
              <option value="accion">Solo acciones</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="sort" className="mr-2 text-sm text-gray-600">Ordenar:</label>
            <select 
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="border rounded-md py-1 px-3 bg-white text-gray-700 focus:ring-green-500 focus:border-green-500"
            >
              <option value="newest">Más recientes primero</option>
              <option value="oldest">Más antiguos primero</option>
            </select>
          </div>
          
          {/* Filtro de calendario nativo */}
          <div className="relative">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center border rounded-md py-1 px-3 bg-white text-gray-700 hover:bg-gray-50 focus:ring-green-500 focus:border-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {dateFilter.startDate || dateFilter.endDate ? (
                <span className="text-sm">
                  {dateFilter.startDate && new Date(dateFilter.startDate).toLocaleDateString('es-ES')} - 
                  {dateFilter.endDate && new Date(dateFilter.endDate).toLocaleDateString('es-ES')}
                </span>
              ) : (
                <span className="text-sm">Filtrar por fecha</span>
              )}
            </button>
            
            {showCalendar && (
              <div className="absolute right-0 mt-1 z-50 bg-white rounded-lg shadow-lg p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col">
                    <label htmlFor="startDate" className="text-sm text-gray-600 mb-1">Fecha inicial:</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={dateFilter.startDate || ''}
                      onChange={handleDateChange}
                      className="border rounded-md py-1 px-3 text-gray-700 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label htmlFor="endDate" className="text-sm text-gray-600 mb-1">Fecha final:</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={dateFilter.endDate || ''}
                      onChange={handleDateChange}
                      className="border rounded-md py-1 px-3 text-gray-700 focus:ring-green-500 focus:border-green-500"
                      min={dateFilter.startDate}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    <button 
                      onClick={clearDateFilter}
                      className="text-red-600 px-3 py-1 text-sm rounded-md hover:bg-red-50"
                    >
                      Limpiar filtro
                    </button>
                    <button 
                      onClick={applyDateFilter}
                      className="bg-green-600 text-white px-3 py-1 text-sm rounded-md hover:bg-green-700"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {(dateFilter.startDate || dateFilter.endDate) && !showCalendar && (
              <button 
                onClick={clearDateFilter}
                className="ml-2 text-red-600 text-sm hover:text-red-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {timelineEntries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No hay registros que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {timelineEntries.map((entry, index) => {
            if (entry.type === 'bitacora') {
              const bitacoraEntry = entry.data;
              const nearestLog = findNearestLog(bitacoraEntry.timestamp);
              
              return (
                <div key={`bitacora-${bitacoraEntry.timestamp}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[320px]">
                  
                  <div 
                    className="bg-green-50 p-3 cursor-pointer"
                    onClick={() => openBitacoraViewer(bitacoraEntry)}
                  >
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
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(bitacoraEntry.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div 
                    className="h-40 overflow-hidden cursor-pointer"
                    onClick={() => openBitacoraViewer(bitacoraEntry)}
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
            } else if (entry.type === 'ambiente') {
              const ambienteLog = entry.data;
              
              return (
                <div 
                  key={`ambiente-${ambienteLog.timestamp}-${index}`} 
                  className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[320px] cursor-pointer"
                  onClick={() => openAmbienteViewer(ambienteLog)}
                >
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
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ambienteLog.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="p-2 flex-1 grid grid-cols-2 grid-rows-2 gap-2">
                    {/* Tarjeta de Temperatura */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-md p-2 border border-blue-200 shadow-sm hover:shadow transition-all">
                      <div className="flex items-center mb-0.5">
                        <p className="text-xs font-medium text-blue-700">🌡️ Temperatura</p>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{ambienteLog.temperatura.toFixed(1)} <span className="text-sm">°C</span></p>
                    </div>
                    
                    {/* Tarjeta de Humedad */}
                    <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-md p-2 border border-cyan-200 shadow-sm hover:shadow transition-all">
                      <div className="flex items-center mb-0.5">
                        <p className="text-xs font-medium text-cyan-700">💧 Humedad</p>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{ambienteLog.humedad.toFixed(1)} <span className="text-sm">%</span></p>
                    </div>
                    
                    {/* Tarjeta de VPD */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-md p-2 border border-purple-200 shadow-sm hover:shadow transition-all">
                      <div className="flex items-center mb-0.5">
                        <p className="text-xs font-medium text-purple-700">💨 VPD</p>
                      </div>
                      <div className="flex items-baseline">
                        <p className="text-xl font-bold text-gray-800">{ambienteLog.vpd.toFixed(2)}</p>
                        <p className="text-xs text-gray-600 ml-1">kPa</p>
                      </div>
                    </div>
                    
                    {/* Tarjeta de Punto de Rocío */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-md p-2 border border-green-200 shadow-sm hover:shadow transition-all">
                      <div className="flex items-center mb-0.5">
                        <p className="text-xs font-medium text-green-700">🌡️ Punto de Rocío</p>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{ambienteLog.dewpoint.toFixed(1)} <span className="text-sm">°C</span></p>
                    </div>
                  </div>
                </div>
              );
            } else if (entry.type === 'accion') {
              const actionLog = entry.data;
              
              return (
                <div 
                  key={`accion-${actionLog.timestamp}-${index}`} 
                  className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[320px] cursor-pointer"
                  onClick={() => openActionViewer(actionLog)}
                >
                  {/* Cabecera del log de acción */}
                  <div className="bg-yellow-50 p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-yellow-700">Registro de Acción</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteActionLog(actionLog.id || actionLog.timestamp, actionLog.timestamp);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(actionLog.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="p-3 flex-1 flex flex-col space-y-2">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getActionIcon(actionLog.tipo)}</span>
                      <p className="text-sm font-medium text-gray-700">{getActionName(actionLog.tipo, actionLog.data)}</p>
                    </div>
                    
                    {/* Mostrar datos específicos según el tipo de acción */}
                    <div className="space-y-1 mt-1">
                      {actionLog.tipo === 'riego' && (
                        <>
                          {actionLog.data.cantidad && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 w-16">Cantidad:</span>
                              <span className="text-sm text-gray-700">{actionLog.data.cantidad} L</span>
                            </div>
                          )}
                          {actionLog.data.ph && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 w-16">pH:</span>
                              <span className="text-sm text-gray-700">{actionLog.data.ph}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {actionLog.tipo === 'fertilizacion' && actionLog.data.producto && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 w-16">Producto:</span>
                          <span className="text-sm text-gray-700 line-clamp-1">{actionLog.data.producto}</span>
                        </div>
                      )}
                      
                      {actionLog.tipo === 'tratamiento' && actionLog.data.tratamiento && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 w-16">Tipo:</span>
                          <span className="text-sm text-gray-700 line-clamp-1">{actionLog.data.tratamiento}</span>
                        </div>
                      )}
                      
                      {actionLog.data.notas && (
                        <div className="flex items-start">
                          <span className="text-xs text-gray-500 w-16">Notas:</span>
                          <span className="text-xs text-gray-600 line-clamp-2">{actionLog.data.notas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Modal para visualizar/editar entradas de bitácora */}
      {bitacoraModal.isOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                Registro de Bitácora
              </h3>
              <button 
                onClick={closeBitacoraViewer}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  {new Date(selectedEntry.timestamp).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="mb-6">
                <img 
                  src={selectedEntry.url_image} 
                  alt={selectedEntry.descripcion} 
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
              
              {bitacoraModal.isEditing ? (
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              ) : (
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedEntry.descripcion}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-4">
                {bitacoraModal.isEditing ? (
                  <>
                    <button
                      onClick={cancelBitacoraEditMode}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={bitacoraModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedDescription}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={bitacoraModal.isSaving}
                    >
                      {bitacoraModal.isSaving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Guardando...
                        </span>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleBitacoraEditMode(true)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEntry.timestamp)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar/editar logs de ambiente */}
      {ambienteModal.isOpen && selectedAmbienteLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                Registro de Ambiente
              </h3>
              <button 
                onClick={closeAmbienteViewer}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                    {new Date(selectedAmbienteLog.timestamp).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {ambienteModal.isEditing ? (
                  <>
                    <div>
                      <label htmlFor="temperatura" className="block text-sm font-medium text-gray-700 mb-1">
                          Temperatura (°C)
                        </label>
                      <input
                        type="text"
                        id="temperatura"
                        name="temperatura"
                        value={editedAmbiente.temperatura}
                        onChange={handleAmbienteInputChange}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="humedad" className="block text-sm font-medium text-gray-700 mb-1">
                          Humedad (%)
                        </label>
                      <input
                        type="text"
                        id="humedad"
                        name="humedad"
                        value={editedAmbiente.humedad}
                        onChange={handleAmbienteInputChange}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="vpd" className="block text-sm font-medium text-gray-700 mb-1">
                          VPD (kPa)
                        </label>
                      <input
                        type="text"
                        id="vpd"
                        name="vpd"
                        value={editedAmbiente.vpd}
                        onChange={handleAmbienteInputChange}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                        disabled
                      />
                      </div>
                    
                    <div>
                      <label htmlFor="dewpoint" className="block text-sm font-medium text-gray-700 mb-1">
                        Punto de Rocío (°C)
                      </label>
                      <input
                        type="text"
                        id="dewpoint"
                        name="dewpoint"
                        value={editedAmbiente.dewpoint}
                        onChange={handleAmbienteInputChange}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                        disabled
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3 relative">
                      <p className="text-sm text-gray-500">Temperatura</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-semibold text-gray-800">{selectedAmbienteLog.temperatura.toFixed(1)} °C</p>
                        <button 
                          onClick={() => editSpecificField('temperatura')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar temperatura"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 relative">
                      <p className="text-sm text-gray-500">Humedad</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-semibold text-gray-800">{selectedAmbienteLog.humedad.toFixed(1)} %</p>
                        <button 
                          onClick={() => editSpecificField('humedad')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar humedad"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">VPD</p>
                      <p className="text-xl font-semibold text-gray-800">{selectedAmbienteLog.vpd.toFixed(2)} kPa</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Punto de Rocío</p>
                      <p className="text-xl font-semibold text-gray-800">{selectedAmbienteLog.dewpoint.toFixed(2)} °C</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                {ambienteModal.isEditing ? (
                  <>
                    <button
                      onClick={cancelAmbienteEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={ambienteModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedAmbiente}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={ambienteModal.isSaving}
                    >
                      {ambienteModal.isSaving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Guardando...
                        </span>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDeleteAmbienteLog(selectedAmbienteLog.timestamp)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar/editar acciones */}
      {actionModal.isOpen && selectedActionLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {getActionName(selectedActionLog.tipo, selectedActionLog.data)}
              </h3>
              <button 
                onClick={closeActionViewer}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
              </button>
                      </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  {new Date(selectedActionLog.timestamp).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="mb-4">
                <div className="bg-yellow-50 p-3 rounded-lg flex items-center">
                  <span className="text-2xl mr-2">{getActionIcon(selectedActionLog.tipo)}</span>
                  <span className="font-medium text-yellow-800">{getActionName(selectedActionLog.tipo, selectedActionLog.data)}</span>
                </div>
              </div>
              
              {actionModal.isEditing ? (
                <div className="space-y-4">
                  {selectedActionLog.tipo === 'riego' && (
                    <>
                      <div>
                        <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad (L)
                        </label>
                        <input
                          type="text"
                          id="cantidad"
                          value={editedAction.cantidad || ''}
                          onChange={(e) => setEditedAction({...editedAction, cantidad: e.target.value})}
                          className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="ph" className="block text-sm font-medium text-gray-700 mb-1">
                          pH
                        </label>
                        <input
                          type="text"
                          id="ph"
                          value={editedAction.ph || ''}
                          onChange={(e) => setEditedAction({...editedAction, ph: e.target.value})}
                          className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedActionLog.tipo === 'fertilizacion' && (
                    <div>
                      <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">
                        Producto
                      </label>
                      <input
                        type="text"
                        id="producto"
                        value={editedAction.producto || ''}
                        onChange={(e) => setEditedAction({...editedAction, producto: e.target.value})}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  )}
                  
                  {selectedActionLog.tipo === 'tratamiento' && (
                    <div>
                      <label htmlFor="tratamiento" className="block text-sm font-medium text-gray-700 mb-1">
                        Tratamiento
                      </label>
                      <input
                        type="text"
                        id="tratamiento"
                        value={editedAction.tratamiento || ''}
                        onChange={(e) => setEditedAction({...editedAction, tratamiento: e.target.value})}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="notas" className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      id="notas"
                      value={editedAction.notas || ''}
                      onChange={(e) => setEditedAction({...editedAction, notas: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(selectedActionLog.data || {}).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500 capitalize">{key}</p>
                      <p className="text-gray-800">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-4">
                {actionModal.isEditing ? (
                  <>
                        <button 
                      onClick={cancelActionEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={actionModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedAction}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={actionModal.isSaving}
                    >
                      {actionModal.isSaving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Guardando...
                        </span>
                      ) : (
                        'Guardar Cambios'
                      )}
                        </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={enableActionEditMode}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteActionLog(selectedActionLog.id || selectedActionLog.timestamp, selectedActionLog.timestamp)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Eliminar
                    </button>
                  </>
                )}
                      </div>
                    </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompleteLogsView; 