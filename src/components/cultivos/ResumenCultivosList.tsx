import React from 'react';

interface Cultivo {
  id: number;
  tipo_cultivo?: string;
  updated_at?: string;
  created_at: string;
  config?: {
    numPlantas?: number;
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
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Últimos Cultivos</h3>
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
                <div>
                  <p className="font-medium">Cultivo #{cultivo.id}</p>
                  <p className="text-sm text-gray-500">{cultivo.tipo_cultivo || "Sin tipo"}</p>
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
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default ResumenCultivosList;