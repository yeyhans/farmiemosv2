import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


interface FaseData {
  start: string;
  end: string | null;
}

interface FaseFenologicaViewProps {
  cultivoId: string;
  fasesFenologicas?: Record<string, FaseData | string>;
}

function FaseFenologicaView({ cultivoId, fasesFenologicas = {} }: FaseFenologicaViewProps) {

  
  const fases = [
    { id: 'propagacion', nombre: 'Propagación', icon: '🌱' },
    { id: 'crecimiento', nombre: 'Crecimiento', icon: '🌿' },
    { id: 'floracion', nombre: 'Floración', icon: '🌸' },
    { id: 'cosecha', nombre: 'Cosecha', icon: '✂️' }
  ];

  // Normalizar los datos de las fases
  const normalizedFases: Record<string, FaseData> = {};
  Object.entries(fasesFenologicas).forEach(([key, value]) => {
    if (typeof value === 'string') {
      normalizedFases[key] = { start: value, end: null };
    } else if (value && typeof value === 'object') {
      normalizedFases[key] = value as FaseData;
    }
  });

  // Obtener la fase activa actual
  const getCurrentActiveFase = (): string | null => {
    const today = new Date();
    let activeFaseId: string | null = null;
    
    const fasesOrdenadas = fases
      .map(fase => ({
        ...fase,
        startDate: normalizedFases[fase.id]?.start ? new Date(normalizedFases[fase.id].start) : null
      }))
      .filter(fase => fase.startDate !== null);

    fasesOrdenadas.sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    for (let i = 0; i < fasesOrdenadas.length; i++) {
      const currentFase = fasesOrdenadas[i];
      const nextFase = fasesOrdenadas[i + 1];
      
      if (!currentFase.startDate) continue;

      if (nextFase?.startDate) {
        if (today >= currentFase.startDate && today < nextFase.startDate) {
          activeFaseId = currentFase.id;
          break;
        }
      } else {
        if (today >= currentFase.startDate) {
          activeFaseId = currentFase.id;
          break;
        }
      }
    }

    return activeFaseId;
  };

  const activeFase = getCurrentActiveFase();

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'No registrada';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const getFaseStatus = (faseId: string): 'pendiente' | 'activa' | 'completada' => {
    const faseData = normalizedFases[faseId];
    if (!faseData?.start) return 'pendiente';
    if (faseId === activeFase) return 'activa';
    const faseStartDate = new Date(faseData.start);
    const today = new Date();
    return faseStartDate <= today && faseId !== activeFase ? 'completada' : 'pendiente';
  };

  return (
    <div className="w-full relative">
      {/* Config button */}
      <button
        onClick={() => window.location.href = `/cultivo/${cultivoId}/indoor/config#fase-fenologica`}
        className="absolute -top-12 right-0 text-xs md:text-sm bg-blue-600 text-white px-2 md:px-3 py-1 rounded-full hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
      >
        <span className="hidden md:inline">Configurar</span>
        <span className="md:hidden">Config</span>
        <span>⚙️</span>
      </button>

      {/* Timeline */}
      <div className="relative px-4 md:px-0 mt-8">
        {/* Timeline line */}
        <div className="absolute h-1 w-full bg-gray-200 top-7 rounded-full"></div>
        
        {/* Fases */}
        <div className="relative flex justify-between">
          {fases.map((fase, index) => {
            const faseStatus = getFaseStatus(fase.id);
            const isActive = faseStatus === 'activa';
            const isCompleted = faseStatus === 'completada';
            const faseData = normalizedFases[fase.id];
            
            return (
              <div key={fase.id} className="flex flex-col items-center z-10 relative">
                {/* Fase icon */}
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-lg
                  ${isActive 
                    ? 'bg-yellow-500 text-white border-4 border-yellow-300' 
                    : isCompleted
                      ? 'bg-green-500 text-white' 
                      : 'bg-white border-2 border-blue-500'
                  }`}
                >
                  <span>{fase.icon}</span>
                  {isActive && (
                    <span className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-800 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                      Activa
                    </span>
                  )}
                </div>

                {/* Fase nombre - solo visible en desktop */}
                <span className="hidden md:block text-xs font-medium mt-2">{fase.nombre}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FaseFenologicaView; 