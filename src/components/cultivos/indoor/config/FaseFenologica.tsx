import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FaseData {
  start: string;
  end: string | null;
}

interface FaseFenologicaProps {
  cultivoId: string;
  fasesFenologicas?: Record<string, FaseData | string>;
}

function FaseFenologica({ cultivoId, fasesFenologicas = {} }: FaseFenologicaProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentFase, setCurrentFase] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customDate, setCustomDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [normalizedFases, setNormalizedFases] = useState<Record<string, FaseData>>({});
  const [localFasesFenologicas, setLocalFasesFenologicas] = useState(fasesFenologicas);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);

  const fases = [
    { id: 'propagacion', nombre: 'Propagación', icon: '🌱' },
    { id: 'crecimiento', nombre: 'Crecimiento', icon: '🌿' },
    { id: 'floracion', nombre: 'Floración', icon: '🌸' },
    { id: 'cosecha', nombre: 'Cosecha', icon: '✂️' }
  ];

  // Actualizar el estado local cuando cambien las props
  useEffect(() => {
    setLocalFasesFenologicas(fasesFenologicas);
  }, [fasesFenologicas]);

  // Normalizar los datos de las fases para manejar el formato antiguo y nuevo
  useEffect(() => {
    const normalized: Record<string, FaseData> = {};
    
    Object.entries(localFasesFenologicas).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Formato antiguo (solo fecha de inicio)
        normalized[key] = { start: value, end: null };
      } else if (value && typeof value === 'object') {
        // Formato nuevo (objeto con start y end)
        normalized[key] = value as FaseData;
      }
    });
    
    setNormalizedFases(normalized);
  }, [localFasesFenologicas]);

  // Modificar getCurrentActiveFase para considerar la fecha actual
  const getCurrentActiveFase = (): string | null => {
    const today = new Date();
    let activeFaseId: string | null = null;
    
    // Ordenar las fases por fecha de inicio
    const fasesOrdenadas = fases.map(fase => ({
      ...fase,
      startDate: normalizedFases[fase.id]?.start ? new Date(normalizedFases[fase.id].start) : null
    })).filter(fase => fase.startDate !== null);

    fasesOrdenadas.sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    // Encontrar la fase activa actual
    for (let i = 0; i < fasesOrdenadas.length; i++) {
      const currentFase = fasesOrdenadas[i];
      const nextFase = fasesOrdenadas[i + 1];
      
      if (!currentFase.startDate) continue;

      if (nextFase?.startDate) {
        // Si hay una siguiente fase, verificar si estamos entre las fechas
        if (today >= currentFase.startDate && today < nextFase.startDate) {
          activeFaseId = currentFase.id;
          break;
        }
      } else {
        // Si es la última fase con fecha, es la activa
        if (today >= currentFase.startDate) {
          activeFaseId = currentFase.id;
          break;
        }
      }
    }

    return activeFaseId;
  };

  const activeFase = getCurrentActiveFase();

  // Agregar función para eliminar fecha de una fase
  const handleDeleteFase = async (faseId: string) => {
    if (loading) return;

    const faseIndex = fases.findIndex(f => f.id === faseId);
    const currentActiveFase = getCurrentActiveFase();
    
    // No permitir eliminar fases anteriores a la activa
    if (currentActiveFase) {
      const activeIndex = fases.findIndex(f => f.id === currentActiveFase);
      if (faseIndex < activeIndex) {
        console.error("No se pueden eliminar fases anteriores a la activa");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cultivos/config-fase-fenologica', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cultivoId,
          fase: faseId,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.fasesFenologicas) {
        setLocalFasesFenologicas(data.data.fasesFenologicas);
      }
    } catch (error) {
      console.error("Error deleting phase:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modificar handleFaseClick para validar el orden
  const handleFaseClick = async (faseId: string) => {
    if (showModal || loading) return;

    const faseIndex = fases.findIndex(f => f.id === faseId);
    const previousFases = fases.slice(0, faseIndex);
    
    // Verificar que todas las fases anteriores estén registradas
    const allPreviousFasesRegistered = previousFases.every(
      fase => normalizedFases[fase.id]?.start
    );

    if (!allPreviousFasesRegistered) {
      console.error("Debes registrar las fases anteriores primero");
      return;
    }

    setCurrentFase(faseId);
    try {
      await handleSaveFase(faseId);
    } catch (error) {
      console.error("Error handling phase click:", error);
    }
  };

  // Add error handling for date formatting
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'No registrada';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Fecha inválida';
    }
  };

  const handleSaveFase = async (clickedFaseId?: string) => {
    const faseToSave = clickedFaseId || currentFase;
    
    if (!faseToSave || !cultivoId) {
      console.error("Missing required data:", { faseToSave, cultivoId });
      return;
    }

    setLoading(true);

    try {
      const fecha = useCustomDate 
        ? new Date(customDate).toISOString() 
        : new Date().toISOString();

      const response = await fetch('/api/cultivos/config-fase-fenologica', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cultivoId,
          fase: faseToSave,
          fecha
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error del servidor: ${response.status}`);
      }

      if (data.success && data.data?.fasesFenologicas) {
        setLocalFasesFenologicas(data.data.fasesFenologicas);
        setTimeout(() => {
          setShowModal(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error in handleSaveFase:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modificar getFaseStatus para reflejar el nuevo comportamiento
  const getFaseStatus = (faseId: string): 'pendiente' | 'activa' | 'completada' => {
    const faseData = normalizedFases[faseId];
    const currentActive = getCurrentActiveFase();
    const today = new Date();
    
    if (!faseData?.start) {
      return 'pendiente';
    }

    const faseStartDate = new Date(faseData.start);
    
    // Si es la fase activa actual
    if (faseId === currentActive) {
      return 'activa';
    }
    
    // Si la fecha de inicio es futura
    if (faseStartDate > today) {
      return 'pendiente';
    }
    
    // Si la fecha de inicio es pasada y no es la fase activa
    if (faseStartDate <= today && faseId !== currentActive) {
      return 'completada';
    }

    return 'pendiente';
  };

  // Modificar handleDateChange para validar fechas
  const handleDateChange = async (faseId: string, newDate: string) => {
    if (loading) return;

    const newDateTime = new Date(newDate).getTime();
    const today = new Date().getTime();
    
    // No permitir fechas futuras
    if (newDateTime > today) {
      console.error("No se pueden seleccionar fechas futuras");
      return;
    }

    // Validar que la fecha sea posterior a la fase anterior
    const faseIndex = fases.findIndex(f => f.id === faseId);
    if (faseIndex > 0) {
      const previousFase = fases[faseIndex - 1];
      const previousFaseData = normalizedFases[previousFase.id];
      
      if (previousFaseData?.start) {
        const previousDate = new Date(previousFaseData.start).getTime();
        if (newDateTime < previousDate) {
          console.error("La fecha debe ser posterior a la fase anterior");
          return;
        }
      }
    }

    // Validar que la fecha sea anterior a la siguiente fase
    const nextFase = fases[faseIndex + 1];
    if (nextFase) {
      const nextFaseData = normalizedFases[nextFase.id];
      if (nextFaseData?.start) {
        const nextDate = new Date(nextFaseData.start).getTime();
        if (newDateTime > nextDate) {
          console.error("La fecha debe ser anterior a la siguiente fase");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cultivos/config-fase-fenologica', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cultivoId,
          fase: faseId,
          fecha: new Date(newDate).toISOString()
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.fasesFenologicas) {
        setLocalFasesFenologicas(data.data.fasesFenologicas);
      }
    } catch (error) {
      console.error("Error updating date:", error);
    } finally {
      setLoading(false);
      setDatePickerOpen(null);
    }
  };

  return (
    <div className="w-full">
      {/* Timeline */}
      <div className="relative px-4 md:px-0">
        {/* Timeline line */}
        <div className="absolute h-1 w-full bg-gray-200 top-10 md:top-10 rounded-full"></div>
        
        {/* Fases */}
        <div className="relative flex flex-col md:flex-row md:justify-between gap-8 md:gap-0">
          {fases.map((fase, index) => {
            const faseStatus = getFaseStatus(fase.id);
            const isActive = faseStatus === 'activa';
            const isCompleted = faseStatus === 'completada';
            const faseData = normalizedFases[fase.id];
            const nextFase = fases[index + 1];
            const nextFaseData = nextFase ? normalizedFases[nextFase.id] : null;
            const canDelete = faseData?.start && (!activeFase || 
              fases.findIndex(f => f.id === activeFase) <= index);
            
            return (
              <div key={fase.id} className="flex items-center md:flex-col md:items-center z-10 relative">
                {/* Fase button and info container */}
                <div className="flex items-center md:flex-col md:items-center">
                  <button
                    onClick={() => handleFaseClick(fase.id)}
                    disabled={loading}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl md:text-2xl relative 
                    ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'}
                    ${isActive 
                      ? 'bg-yellow-500 text-white border-4 border-yellow-300' 
                      : isCompleted
                        ? 'bg-green-500 text-white' 
                        : 'bg-white border-2 border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <span>{fase.icon}</span>
                    {loading && currentFase === fase.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-full">
                        <span className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        Activa
                      </span>
                    )}
                  </button>
                </div>

                {/* Fase info */}
                <div className="ml-4 md:ml-0 flex flex-col md:items-center">
                  <span className="text-sm font-medium md:mt-2">{fase.nombre}</span>
                  {faseData ? (
                    <div className="text-xs mt-1">
                      <div className="relative group">
                        <div className="flex items-center gap-2">
                          <p 
                            onClick={() => setDatePickerOpen(fase.id)}
                            className="text-xs text-gray-700 font-medium cursor-pointer hover:text-blue-600"
                          >
                            Inicio: {formatDate(faseData.start)}
                          </p>
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFase(fase.id);
                              }}
                              className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                              title="Eliminar fecha"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {datePickerOpen === fase.id && (
                          <div className="absolute z-20 mt-1 bg-white shadow-lg rounded-md p-2">
                            <input
                              type="date"
                              value={faseData.start.split('T')[0]}
                              onChange={(e) => handleDateChange(fase.id, e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="text-sm p-1 border rounded w-full"
                            />
                          </div>
                        )}
                      </div>
                      {nextFaseData && (
                        <p className="text-xs text-gray-500">
                          Fin: {formatDate(nextFaseData.start)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 mt-1">
                      Sin registrar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FaseFenologica;