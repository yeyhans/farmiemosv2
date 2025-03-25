import React from 'react';

interface Cultivo {
  id: number;
  tipo_cultivo?: string;
  updated_at?: string;
  created_at: string;
  config?: {
    numPlantas?: number;
    espacioAncho?: number;
    espacioLargo?: number;
    nombreCultivo?: string;
  };
  fases_fenologicas?: Record<string, boolean>;
  iluminacion?: boolean;
  ambiente_logs?: any[];
  bitacora_logs?: any[];
  actions_logs?: any[];
}

function ResumenCultivosList({ cultivos }: { cultivos: Cultivo[] }) {
  // Get last 2 cultivos, sorted by latest update
  const lastCultivos = [...cultivos]
    .sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at) : new Date(a.created_at);
      const dateB = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 2);

  const getFaseActual = (fases?: Record<string, boolean>) => {
    if (!fases || Object.keys(fases).length === 0) return '❓';
    
    const fasesEmojis: Record<string, string> = {
      propagacion: '🌱',
      crecimiento: '🌿',
      floracion: '🌺',
      cosecha: '✂️',
    };

    const fasesOrdenadas = ['propagacion', 'crecimiento', 'floracion', 'cosecha'];
    const ultimaFase = fasesOrdenadas.reduce((ultima, fase) => {
      if (fases[fase]) return fase;
      return ultima;
    }, '');

    return ultimaFase ? fasesEmojis[ultimaFase] : '❓';
  };

  const getStatusEmojis = (cultivo: Cultivo) => {
    return {
      iluminacion: cultivo.iluminacion ? '💡' : '⚪',
      ambiente_logs: cultivo.ambiente_logs?.length || 0,
      bitacora_logs: cultivo.bitacora_logs?.length || 0,
      actions_logs: cultivo.actions_logs?.length || 0,
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Últimos Cultivos</h3>
        <a href="/cultivo" className="flex items-center justify-center gap-1 border border-green-600 text-custom-green rounded-md hover:bg-green-50 text-custom-green font-medium text-xs py-2 px-3 transition-colors">          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
          Ver más</a>
      </div>
      <div className="space-y-2">
        {lastCultivos.map((cultivo) => (
          <a 
            key={cultivo.id}
            href={`/cultivo/${cultivo.id}`}
            className="flex flex-col p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getFaseActual(cultivo.fases_fenologicas)}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{cultivo.config?.nombreCultivo || "Sin nombre"} <span className="text-sm text-gray-500">{cultivo.tipo_cultivo || "Sin tipo"}</span></span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">
                  {cultivo.config?.numPlantas ? `${cultivo.config.numPlantas} 🌱` : ""}
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="px-2 py-1 bg-gray-100 rounded-md text-xs" title="Iluminación">
                {getStatusEmojis(cultivo).iluminacion}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-md text-xs" title="Registros de ambiente">
                🌡️ {getStatusEmojis(cultivo).ambiente_logs}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-md text-xs" title="Registros de bitácora">
                📝 {getStatusEmojis(cultivo).bitacora_logs}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-md text-xs" title="Registros de acciones">
                ⚡ {getStatusEmojis(cultivo).actions_logs}
              </span>
              {cultivo.config?.espacioAncho && cultivo.config?.espacioLargo && (
                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs" title="Dimensiones del espacio">
                  📏 {cultivo.config.espacioAncho}x{cultivo.config.espacioLargo}
                </span>
              )}

            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default ResumenCultivosList;