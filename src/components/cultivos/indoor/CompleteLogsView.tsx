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

  // Agregar esta función junto a las otras funciones de manejo del modal de ambiente
  const enableAmbienteEditMode = () => {
    setAmbienteModal(prev => ({...prev, isEditing: true}));
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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center">
            <label htmlFor="filter" className="w-[70px] text-xs text-gray-600">Filtrar por:</label>
            <select 
              id="filter"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="w-[200px] border rounded-md py-1 px-3 bg-white text-xs text-gray-700 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todos los registros</option>
              <option value="bitacora">Solo bitácora</option>
              <option value="ambiente">Solo ambiente</option>
              <option value="accion">Solo acciones</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="sort" className="w-[70px] text-xs text-gray-600">Ordenar:</label>
            <select 
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-[200px] border rounded-md py-1 px-3 bg-white text-xs text-gray-700 focus:ring-green-500 focus:border-green-500"
            >
              <option value="newest">Más recientes primero</option>
              <option value="oldest">Más antiguos primero</option>
            </select>
          </div>
          
          {/* Filtro de calendario nativo */}
          <div className="relative flex items-center">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center border rounded-md py-1 px-3 bg-white text-xs text-gray-700 hover:bg-gray-50 focus:ring-green-500 focus:border-green-500 w-[200px] justify-between whitespace-nowrap overflow-hidden"
            >
              <div className="flex items-center min-w-[90px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">
                  {dateFilter.startDate || dateFilter.endDate ? (
                    <span className="truncate">
                      {dateFilter.startDate && new Date(dateFilter.startDate).toLocaleDateString('es-ES')} - 
                      {dateFilter.endDate && new Date(dateFilter.endDate).toLocaleDateString('es-ES')}
                    </span>
                  ) : (
                    'Filtrar por fecha'
                  )}
                </span>
              </div>
            </button>
            
            {showCalendar && (
              <div className="absolute right-0 mt-1 z-50 bg-white rounded-lg shadow-lg p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">Selecciona el rango de fechas:</label>
                    <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={dateFilter.startDate || ''}
                        onChange={(e) => {
                          handleDateChange(e);
                          // Si la fecha final es anterior a la inicial, la actualizamos
                          if (dateFilter.endDate && e.target.value > dateFilter.endDate) {
                            setDateFilter(prev => ({
                              ...prev,
                              endDate: e.target.value
                            }));
                          }
                        }}
                        className="w-[140px] border rounded-md py-1 px-2 text-xs text-gray-700 focus:ring-green-500 focus:border-green-500"
                      />
                      <span className="text-xs text-gray-500">hasta</span>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={dateFilter.endDate || ''}
                        onChange={handleDateChange}
                        min={dateFilter.startDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-[140px] border rounded-md py-1 px-2 text-xs text-gray-700 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  {/* Botones de acciones rápidas */}
                  <div className="flex flex-wrap gap-1">
                    <button 
                      onClick={() => {
                        const today = new Date();
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() - 7);
                        setDateFilter({
                          startDate: startOfWeek.toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        });
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Última semana
                    </button>
                    <button 
                      onClick={() => {
                        const today = new Date();
                        const startOfMonth = new Date(today);
                        startOfMonth.setDate(today.getDate() - 30);
                        setDateFilter({
                          startDate: startOfMonth.toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        });
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Último mes
                    </button>
                    <button 
                      onClick={() => {
                        const today = new Date();
                        const startOfYear = new Date(today);
                        startOfYear.setDate(today.getDate() - 365);
                        setDateFilter({
                          startDate: startOfYear.toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        });
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Último año
                    </button>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t">
                    <button 
                      onClick={clearDateFilter}
                      className="text-red-600 px-3 py-1 text-xs rounded-md hover:bg-red-50"
                    >
                      Limpiar
                    </button>
                    <button 
                      onClick={applyDateFilter}
                      className="bg-green-600 text-white px-3 py-1 text-xs rounded-md hover:bg-green-700"
                      disabled={!dateFilter.startDate || !dateFilter.endDate}
                    >
                      Aplicar filtro
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
                    <p className="text-xs line-clamp-3 text-gray-700 overflow-hidden">{bitacoraEntry.descripcion}</p>
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
                  
                  <div className="p-2 flex-1 overflow-auto">
                    <div className="mb-4 flex items-center justify-center bg-amber-50 p-2 rounded-lg">
                      <span className="mr-2 text-sm">{getActionIcon(actionLog.tipo)}</span>
                      <span className="font-medium text-sm text-amber-800">{getActionName(actionLog.tipo, actionLog.data)}</span>
                    </div>
                    
                    {actionLog.tipo === 'riego' && (
                      <div className="text-xs space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Cantidad:</span> 
                          <span className="text-blue-600 font-medium">{actionLog.data.cantidad} L</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Tipo:</span> 
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                            {actionLog.data.tipo === 'manual' ? 'Manual' : 
                             actionLog.data.tipo === 'goteo' ? 'Goteo' : 
                             actionLog.data.tipo === 'aspersion' ? 'Aspersión' : 
                             actionLog.data.tipo}
                          </span>
                        </div>
                        {actionLog.data.notas && (
                          <div>
                            <span className="font-medium text-gray-700">Notas:</span>
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">{actionLog.data.notas}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {actionLog.tipo === 'poda' && (
                      <div className="text-xs space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Tipo:</span>
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                            {actionLog.data.tipo === 'formacion' ? 'Formación' : 
                             actionLog.data.tipo === 'mantenimiento' ? 'Mantenimiento' : 
                             actionLog.data.tipo === 'sanitaria' ? 'Sanitaria' : 
                             actionLog.data.tipo === 'rejuvenecimiento' ? 'Rejuvenecimiento' : 
                             actionLog.data.tipo}
                          </span>
                        </div>
                        {actionLog.data.herramientas && (
                          <div className="flex items-center text-xs">
                            <span className="font-medium text-gray-700 w-24">Herramientas:</span>
                            <span className="text-gray-600">{actionLog.data.herramientas}</span>
                          </div>
                        )}
                        {actionLog.data.notas && (
                          <div>
                            <span className="font-medium text-gray-700">Notas:</span>
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">{actionLog.data.notas}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {actionLog.tipo === 'fertilizacion' && (
                      <div className="text-xs space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Tipo:</span>
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs">
                            {actionLog.data.tipo === 'organico' ? 'Orgánico' : 
                             actionLog.data.tipo === 'mineral' ? 'Mineral' : 
                             actionLog.data.tipo === 'foliar' ? 'Foliar' : 
                             actionLog.data.tipo === 'compuesto' ? 'Compuesto NPK' : 
                             actionLog.data.tipo}
                          </span>
                        </div>
                        {actionLog.data.cantidad && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-24">Cantidad:</span>
                            <span className="text-emerald-600 font-medium">{actionLog.data.cantidad} kg/L</span>
                          </div>
                        )}
                        {actionLog.data.notas && (
                          <div>
                            <span className="font-medium text-gray-700">Notas:</span>
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">{actionLog.data.notas}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {actionLog.tipo === 'tratamiento' && (
                      <div className="space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Tipo:</span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                            {actionLog.data.tipo === 'fungicida' ? 'Fungicida' : 
                             actionLog.data.tipo === 'insecticida' ? 'Insecticida' : 
                             actionLog.data.tipo === 'herbicida' ? 'Herbicida' : 
                             actionLog.data.tipo === 'otro' ? 'Otro' : 
                             actionLog.data.tipo}
                          </span>
                        </div>
                        {actionLog.data.producto && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-24">Producto:</span>
                            <span className="text-gray-600">{actionLog.data.producto}</span>
                          </div>
                        )}
                        {actionLog.data.dosis && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-24">Dosis:</span>
                            <span className="text-purple-600 font-medium">{actionLog.data.dosis}</span>
                          </div>
                        )}
                        {actionLog.data.notas && (
                          <div>
                            <span className="font-medium text-gray-700">Notas:</span>
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">{actionLog.data.notas}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {actionLog.tipo === 'otro' && (
                      <div className="space-y-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        {actionLog.data.nombre && (
                          <div className="flex items-center text-xs">
                            <span className="font-medium text-gray-700 w-24">Acción:</span>
                            <span className="text-gray-600">{actionLog.data.nombre}</span>
                          </div>
                        )}
                        {actionLog.data.descripcion && (
                          <div>
                            <span className="font-medium text-gray-700 text-xs">Descripción:</span>
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">{actionLog.data.descripcion}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Modal para visualizar/editar entradas de bitácora */}
      {bitacoraModal.isOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <div className="relative">
              <img 
                src={selectedEntry.url_image} 
                alt={selectedEntry.descripcion} 
                className="w-full max-h-[70vh] object-contain"
              />
              <button 
                onClick={closeBitacoraViewer}
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
              
              {bitacoraModal.isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full p-3 border rounded-md focus:ring-green-500 focus:border-green-500 min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={cancelBitacoraEditMode}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      disabled={bitacoraModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedDescription}
                      className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                      disabled={bitacoraModal.isSaving}
                    >
                      {bitacoraModal.isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-gray-700">{selectedEntry.descripcion}</p>
                  <button
                    onClick={() => toggleBitacoraEditMode(true)}
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

      {/* Modal para visualizar/editar logs de ambiente */}
      {ambienteModal.isOpen && selectedAmbienteLog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg overflow-hidden">
            <div className="bg-blue-50 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-blue-700">Registro de Ambiente</h3>
                <p className="text-sm text-gray-500">
                  {formatReadableDate(selectedAmbienteLog.timestamp)}
                </p>
              </div>
              <button 
                onClick={closeAmbienteViewer}
                className="rounded-full p-2 text-gray-500 hover:bg-blue-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {ambienteModal.isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Temperatura (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="temperatura"
                      value={editedAmbiente.temperatura}
                      onChange={handleAmbienteInputChange}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Humedad (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="humedad"
                      value={editedAmbiente.humedad}
                      onChange={handleAmbienteInputChange}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">VPD (kPa)</label>
                    <div className="w-full p-2 border rounded-md bg-gray-50 flex items-center">
                      <span className="text-blue-600 font-medium">{editedAmbiente.vpd}</span>
                      <span className="ml-1 text-gray-500 text-sm">calculado automáticamente</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Punto de rocío (°C)</label>
                    <div className="w-full p-2 border rounded-md bg-gray-50 flex items-center">
                      <span className="text-blue-600 font-medium">{editedAmbiente.dewpoint}</span>
                      <span className="ml-1 text-gray-500 text-sm">calculado automáticamente</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex justify-end gap-2 mt-4">
                    <button
                      onClick={cancelAmbienteEdit}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      disabled={ambienteModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedAmbiente}
                      className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                      disabled={ambienteModal.isSaving}
                    >
                      {ambienteModal.isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Temperatura:</p>
                      <p className="text-2xl font-bold text-orange-500">{formatNumber(selectedAmbienteLog.temperatura)}°C</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Humedad:</p>
                      <p className="text-2xl font-bold text-blue-500">{formatNumber(selectedAmbienteLog.humedad)}%</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">VPD:</p>
                      <p className="text-2xl font-bold text-purple-500">{formatNumber(selectedAmbienteLog.vpd)} kPa</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Punto de rocío:</p>
                      <p className="text-2xl font-bold text-teal-500">{formatNumber(selectedAmbienteLog.dewpoint)}°C</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => handleDeleteAmbienteLog(selectedAmbienteLog.timestamp)}
                      className="flex items-center text-sm text-red-600 hover:text-red-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                    <button
                      onClick={enableAmbienteEditMode}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar valores
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar/editar acciones */}
      {actionModal.isOpen && selectedActionLog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg overflow-hidden">
            <div className="bg-amber-50 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-amber-700">
                  {getActionIcon(selectedActionLog.tipo)} {getActionName(selectedActionLog.tipo, selectedActionLog.data)}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatReadableDate(selectedActionLog.timestamp)}
                </p>
              </div>
              <button 
                onClick={closeActionViewer}
                className="rounded-full p-2 text-gray-500 hover:bg-amber-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {actionModal.isEditing ? (
                <div className="space-y-4">
                  {selectedActionLog.tipo === 'riego' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Cantidad (L)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedAction.cantidad || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, cantidad: parseFloat(e.target.value)}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de riego</label>
                        <select
                          value={editedAction.tipo || 'manual'}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, tipo: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="manual">Manual</option>
                          <option value="goteo">Goteo</option>
                          <option value="aspersion">Aspersión</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Notas</label>
                        <textarea
                          value={editedAction.notas || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, notas: e.target.value}))}
                          className="text-xs w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedActionLog.tipo === 'poda' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de poda</label>
                        <select
                          value={editedAction.tipo || 'formacion'}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, tipo: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="formacion">Formación</option>
                          <option value="mantenimiento">Mantenimiento</option>
                          <option value="sanitaria">Sanitaria</option>
                          <option value="rejuvenecimiento">Rejuvenecimiento</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Herramientas</label>
                        <input
                          type="text"
                          value={editedAction.herramientas || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, herramientas: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Notas</label>
                        <textarea
                          value={editedAction.notas || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, notas: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedActionLog.tipo === 'fertilizacion' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de fertilización</label>
                        <select
                          value={editedAction.tipo || 'organico'}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, tipo: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="organico">Orgánico</option>
                          <option value="mineral">Mineral</option>
                          <option value="foliar">Foliar</option>
                          <option value="compuesto">Compuesto NPK</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Cantidad (kg/L)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedAction.cantidad || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, cantidad: parseFloat(e.target.value)}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Notas</label>
                        <textarea
                          value={editedAction.notas || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, notas: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedActionLog.tipo === 'tratamiento' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de tratamiento</label>
                        <select
                          value={editedAction.tipo || 'fungicida'}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, tipo: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="fungicida">Fungicida</option>
                          <option value="insecticida">Insecticida</option>
                          <option value="herbicida">Herbicida</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Producto</label>
                        <input
                          type="text"
                          value={editedAction.producto || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, producto: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Dosis</label>
                        <input
                          type="text"
                          value={editedAction.dosis || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, dosis: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Notas</label>
                        <textarea
                          value={editedAction.notas || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, notas: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedActionLog.tipo === 'otro' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Nombre de la acción</label>
                        <input
                          type="text"
                          value={editedAction.nombre || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, nombre: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea
                          value={editedAction.descripcion || ''}
                          onChange={(e) => setEditedAction((prev: any) => ({...prev, descripcion: e.target.value}))}
                          className="w-full p-2 border rounded-md focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={cancelActionEdit}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      disabled={actionModal.isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditedAction}
                      className="px-3 py-1 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded"
                      disabled={actionModal.isSaving}
                    >
                      {actionModal.isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {selectedActionLog.tipo === 'riego' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Cantidad:</span> {selectedActionLog.data.cantidad} L</p>
                      <p><span className="font-medium">Tipo:</span> {selectedActionLog.data.tipo === 'manual' ? 'Manual' : 
                                                             selectedActionLog.data.tipo === 'goteo' ? 'Goteo' : 
                                                             selectedActionLog.data.tipo === 'aspersion' ? 'Aspersión' : 
                                                             selectedActionLog.data.tipo}</p>
                      {selectedActionLog.data.notas && (
                        <p><span className="font-medium">Notas:</span> {selectedActionLog.data.notas}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedActionLog.tipo === 'poda' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tipo:</span> {selectedActionLog.data.tipo === 'formacion' ? 'Formación' :
                                                            selectedActionLog.data.tipo === 'mantenimiento' ? 'Mantenimiento' :
                                                            selectedActionLog.data.tipo === 'sanitaria' ? 'Sanitaria' :
                                                            selectedActionLog.data.tipo === 'rejuvenecimiento' ? 'Rejuvenecimiento' :
                                                            selectedActionLog.data.tipo}</p>
                      {selectedActionLog.data.herramientas && (
                        <p><span className="font-medium">Herramientas:</span> {selectedActionLog.data.herramientas}</p>
                      )}
                      {selectedActionLog.data.notas && (
                        <p><span className="font-medium">Notas:</span> {selectedActionLog.data.notas}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedActionLog.tipo === 'fertilizacion' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tipo:</span> {selectedActionLog.data.tipo === 'organico' ? 'Orgánico' :
                                                            selectedActionLog.data.tipo === 'mineral' ? 'Mineral' :
                                                            selectedActionLog.data.tipo === 'foliar' ? 'Foliar' :
                                                            selectedActionLog.data.tipo === 'compuesto' ? 'Compuesto NPK' :
                                                            selectedActionLog.data.tipo}</p>
                      {selectedActionLog.data.cantidad && (
                        <p><span className="font-medium">Cantidad:</span> {selectedActionLog.data.cantidad} kg/L</p>
                      )}
                      {selectedActionLog.data.notas && (
                        <p><span className="font-medium">Notas:</span> {selectedActionLog.data.notas}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedActionLog.tipo === 'tratamiento' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tipo:</span> {selectedActionLog.data.tipo === 'fungicida' ? 'Fungicida' :
                                                            selectedActionLog.data.tipo === 'insecticida' ? 'Insecticida' :
                                                            selectedActionLog.data.tipo === 'herbicida' ? 'Herbicida' :
                                                            selectedActionLog.data.tipo === 'otro' ? 'Otro' :
                                                            selectedActionLog.data.tipo}</p>
                      {selectedActionLog.data.producto && (
                        <p><span className="font-medium">Producto:</span> {selectedActionLog.data.producto}</p>
                      )}
                      {selectedActionLog.data.dosis && (
                        <p><span className="font-medium">Dosis:</span> {selectedActionLog.data.dosis}</p>
                      )}
                      {selectedActionLog.data.notas && (
                        <p><span className="font-medium">Notas:</span> {selectedActionLog.data.notas}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedActionLog.tipo === 'otro' && (
                    <div className="space-y-2 text-sm">
                      {selectedActionLog.data.nombre && (
                        <p><span className="font-medium">Acción:</span> {selectedActionLog.data.nombre}</p>
                      )}
                      {selectedActionLog.data.descripcion && (
                        <p><span className="font-medium">Descripción:</span> {selectedActionLog.data.descripcion}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleDeleteActionLog(selectedActionLog.id || selectedActionLog.data?.id || selectedActionLog.timestamp, selectedActionLog.timestamp)}
                      className="flex items-center text-sm text-red-600 hover:text-red-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                    <button
                      onClick={enableActionEditMode}
                      className="flex items-center text-sm text-amber-600 hover:text-amber-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar detalles
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompleteLogsView; 